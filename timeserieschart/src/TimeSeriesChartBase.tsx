// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { forwardRef, MouseEvent, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Box, Portal } from '@mui/material';
import merge from 'lodash/merge';
import isEqual from 'lodash/isEqual';
import { getCommonTimeScale, TimeScale, FormatOptions, TimeSeries } from '@perses-dev/core';
import type {
  EChartsCoreOption,
  GridComponentOption,
  LineSeriesOption,
  YAXisComponentOption,
  TooltipComponentOption,
} from 'echarts';
import { ECharts as EChartsInstance, use } from 'echarts/core';
import { LineChart as EChartsLineChart, BarChart as EChartsBarChart } from 'echarts/charts';
import {
  GridComponent,
  DatasetComponent,
  DataZoomComponent,
  MarkAreaComponent,
  MarkLineComponent,
  MarkPointComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import {
  ChartInstance,
  ChartInstanceFocusOpts,
  clearHighlightedSeries,
  CursorCoordinates,
  DEFAULT_PINNED_CROSSHAIR,
  DEFAULT_TOOLTIP_CONFIG,
  EChart,
  enableDataZoom,
  getClosestTimestamp,
  getFormattedAxis,
  getPointInGrid,
  OnEventsType,
  restoreChart,
  TimeChartSeriesMapping,
  TimeChartTooltip,
  TooltipConfig,
  useChartsContext,
  useTimeZone,
  ZoomEventData,
} from '@perses-dev/components';
import { DatasetOption } from 'echarts/types/dist/shared';
import { createTimezoneAwareAxisFormatter } from './utils/timezone-formatter';
import { TimeSeriesAnnotation } from './utils/annotation';

use([
  EChartsLineChart,
  EChartsBarChart,
  GridComponent,
  DatasetComponent,
  DataZoomComponent,
  MarkAreaComponent,
  MarkLineComponent,
  MarkPointComponent,
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
  CanvasRenderer,
]);

const DUMMY_ANNOTATIONS: TimeSeriesAnnotation[] = [
  {
    name: 'test',
    color: 'red',
    start: Date.now() - 10 * 60 * 1000, // 10 minutes ago
    end: Date.now(),
    title: 'Test Annotation',
    legend: 'Deployment v1.2.3',
    tags: { environment: 'production', team: 'platform' },
  },
  {
    name: 'test',
    start: Date.now() - 30 * 60 * 1000, // 30 minutes ago (point annotation)
    title: 'Single Event',
    legend: 'Config Change',
    tags: { type: 'config', user: 'admin' },
  },
];

export interface TimeChartProps {
  height: number;
  data: TimeSeries[];
  seriesMapping: TimeChartSeriesMapping;
  annotations?: TimeSeriesAnnotation[];
  timeScale?: TimeScale;
  yAxis?: YAXisComponentOption | YAXisComponentOption[];
  format?: FormatOptions;
  /**
   * Map of series ID to format options, used for tooltip formatting when series have different units
   */
  seriesFormatMap?: Map<string, FormatOptions>;
  grid?: GridComponentOption;
  tooltipConfig?: TooltipConfig;
  noDataVariant?: 'chart' | 'message';
  syncGroup?: string;
  isStackedBar?: boolean;
  onDataZoom?: (e: ZoomEventData) => void;
  onDoubleClick?: (e: MouseEvent) => void;
  __experimentalEChartsOptionsOverride?: (options: EChartsCoreOption) => EChartsCoreOption;
}

export const TimeSeriesChartBase = forwardRef<ChartInstance, TimeChartProps>(function TimeChart(
  {
    height,
    data,
    seriesMapping,
    timeScale: timeScaleProp,
    yAxis,
    format,
    seriesFormatMap,
    grid,
    isStackedBar = false,
    tooltipConfig = DEFAULT_TOOLTIP_CONFIG,
    noDataVariant = 'message',
    syncGroup,
    onDataZoom,
    onDoubleClick,
    __experimentalEChartsOptionsOverride,
  },
  ref
) {
  const { chartsTheme, enablePinning, enableSyncGrouping, lastTooltipPinnedCoords, setLastTooltipPinnedCoords } =
    useChartsContext();
  const isPinningEnabled = tooltipConfig.enablePinning && enablePinning;
  const chartRef = useRef<EChartsInstance>();
  const [showTooltip, setShowTooltip] = useState<boolean>(true);
  const [tooltipPinnedCoords, setTooltipPinnedCoords] = useState<CursorCoordinates | null>(null);
  const [pinnedCrosshair, setPinnedCrosshair] = useState<LineSeriesOption | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [hoveredAnnotation, setHoveredAnnotation] = useState<TimeSeriesAnnotation | null>(null);
  const [annotationTooltipPos, setAnnotationTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const { timeZone } = useTimeZone();

  const getTimezoneAwareAxisFormatter = useCallback(
    (rangeMs: number): ((value: number) => string) => createTimezoneAwareAxisFormatter(rangeMs, timeZone),
    [timeZone]
  );

  let timeScale: TimeScale;
  if (timeScaleProp === undefined) {
    const commonTimeScale = getCommonTimeScale(data);
    if (commonTimeScale === undefined) {
      // set default to past 5 years
      const today = new Date();
      const pastDate = new Date(today);
      pastDate.setFullYear(today.getFullYear() - 5);
      const todayMs = today.getTime();
      const pastDateMs = pastDate.getTime();
      timeScale = { startMs: pastDateMs, endMs: todayMs, stepMs: 1, rangeMs: todayMs - pastDateMs };
    } else {
      timeScale = commonTimeScale;
    }
  } else {
    timeScale = timeScaleProp;
  }

  useImperativeHandle(ref, () => {
    return {
      highlightSeries({ name }: ChartInstanceFocusOpts): void {
        if (!chartRef.current) {
          // when chart undef, do not highlight series when hovering over legend
          return;
        }

        chartRef.current.dispatchAction({ type: 'highlight', seriesId: name });
      },
      clearHighlightedSeries: (): void => {
        if (!chartRef.current) {
          // when chart undef, do not clear highlight series
          return;
        }
        clearHighlightedSeries(chartRef.current);
      },
    };
  }, []);

  const handleEvents: OnEventsType<LineSeriesOption['data'] | unknown> = useMemo(() => {
    return {
      datazoom: (params): void => {
        if (onDataZoom === undefined) {
          setTimeout(() => {
            // workaround so unpin happens after click event
            setTooltipPinnedCoords(null);
          }, 10);
        }
        if (onDataZoom === undefined || params.batch[0] === undefined) return;
        const xAxisStartValue = params.batch[0].startValue;
        const xAxisEndValue = params.batch[0].endValue;
        if (xAxisStartValue !== undefined && xAxisEndValue !== undefined) {
          const zoomEvent: ZoomEventData = {
            start: xAxisStartValue,
            end: xAxisEndValue,
          };
          onDataZoom(zoomEvent);
        }
      },
      finished: (): void => {
        if (chartRef.current !== undefined) {
          enableDataZoom(chartRef.current);
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mouseover: (params: any): void => {
        // Handle annotation hover for markPoint (triangle markers under X-axis)
        if (params.componentType === 'markPoint' && params.data?.annotationIndex !== undefined) {
          const annotations = DUMMY_ANNOTATIONS;
          const annotationIndex = params.data.annotationIndex;
          const matchedAnnotation = annotations[annotationIndex] || null;
          if (matchedAnnotation) {
            setHoveredAnnotation(matchedAnnotation);
            setAnnotationTooltipPos({ x: params.event?.offsetX || 0, y: params.event?.offsetY || 0 });
          }
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mouseout: (params: any): void => {
        if (params.componentType === 'markPoint' && params.data?.annotationIndex !== undefined) {
          setHoveredAnnotation(null);
          setAnnotationTooltipPos(null);
        }
      },
    };
  }, [onDataZoom, setTooltipPinnedCoords]);

  // Generate annotation series for ECharts markArea (range), markLine (point), and markPoint (markers under X-axis)
  const annotationSeries = useMemo(() => {
    const annotations = DUMMY_ANNOTATIONS; // Using dummy annotations for testing
    if (!annotations || annotations.length === 0) return [];

    const markAreaData: Array<[{ xAxis: number; itemStyle?: { color: string; opacity: number } }, { xAxis: number }]> =
      [];
    const markLineData: Array<{
      xAxis: number;
      lineStyle?: { color: string; width: number; type: 'dashed' | 'solid' | 'dotted' };
      label?: { show: boolean };
    }> = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markPointData: any[] = [];

    annotations.forEach((annotation, index) => {
      const color = '#FF6B6B'; // TODO
      const opacity = 0.3; // TODO

      if (annotation.end !== undefined) {
        // Range annotation - use markArea and markLine (silent) + markers at start/end
        markLineData.push({
          xAxis: annotation.start,
          lineStyle: { color, width: 2, type: 'dashed' as const },
          label: { show: false },
        });

        markLineData.push({
          xAxis: annotation.end,
          lineStyle: { color, width: 2, type: 'dashed' as const },
          label: { show: false },
        });

        markAreaData.push([
          {
            xAxis: annotation.start,
            itemStyle: { color, opacity },
          },
          { xAxis: annotation.end },
        ]);

        // Add start marker
        markPointData.push({
          coord: [annotation.start, 0],
          symbol: 'triangle',
          symbolSize: [12, 10],
          symbolRotate: 0,
          symbolOffset: [0, '120%'], // Position below X-axis
          itemStyle: { color },
          annotationIndex: index,
          isStart: true,
        });

        // Add end marker
        markPointData.push({
          coord: [annotation.end, 0],
          symbol: 'triangle',
          symbolSize: [12, 10],
          symbolRotate: 0,
          symbolOffset: [0, '120%'], // Position below X-axis
          itemStyle: { color },
          annotationIndex: index,
          isEnd: true,
        });
      } else {
        // Point annotation - use markLine (silent) + single marker
        markLineData.push({
          xAxis: annotation.start,
          lineStyle: { color, width: 2, type: 'dashed' as const },
          label: { show: false },
        });

        // Add point marker
        markPointData.push({
          coord: [annotation.start, 0],
          symbol: 'triangle',
          symbolSize: [12, 10],
          symbolRotate: 0,
          symbolOffset: [0, '120%'], // Position below X-axis
          itemStyle: { color },
          annotationIndex: index,
          isPoint: true,
        });
      }
    });

    const series: LineSeriesOption = {
      type: 'line',
      data: [],
      silent: false,
      markArea:
        markAreaData.length > 0
          ? {
              silent: true, // Make area silent, only markers are interactive
              data: markAreaData,
              label: {
                show: false,
              },
            }
          : undefined,
      markLine:
        markLineData.length > 0
          ? {
              silent: true, // Make line silent, only markers are interactive
              symbol: ['none', 'none'],
              data: markLineData,
              lineStyle: {
                type: 'dashed',
              },
            }
          : undefined,
      markPoint:
        markPointData.length > 0
          ? {
              silent: false, // Markers are interactive
              data: markPointData,
              label: {
                show: false,
              },
            }
          : undefined,
    };

    return [series];
  }, []);

  const { noDataOption } = chartsTheme;

  const option: EChartsCoreOption = useMemo(() => {
    // The "chart" `noDataVariant` is only used when the `timeSeries` is an
    // empty array because a `null` value will throw an error.
    if (data === null || (data.length === 0 && noDataVariant === 'message')) return noDataOption;

    // Utilizes ECharts dataset so raw data is separate from series option style properties
    // https://apache.github.io/echarts-handbook/en/concepts/dataset/
    const dataset: DatasetOption[] = [];
    data.map((d, index) => {
      const values = d.values.map(([timestamp, value]) => {
        const val: string | number = value === null ? '-' : value; // echarts use '-' to represent null data
        return [timestamp, val];
      });
      dataset.push({ id: index, source: [...values], dimensions: ['time', 'value'] });
    });

    const updatedSeriesMapping =
      enablePinning && pinnedCrosshair !== null
        ? [...seriesMapping, pinnedCrosshair, ...annotationSeries]
        : [...seriesMapping, ...annotationSeries];

    const option: EChartsCoreOption = {
      dataset: dataset,
      series: updatedSeriesMapping,
      xAxis: {
        type: 'time',
        min: timeScale.startMs,
        max: timeScale.endMs,
        axisLabel: {
          hideOverlap: true,
          formatter: getTimezoneAwareAxisFormatter(timeScale.rangeMs ?? 0),
        },
        axisPointer: {
          snap: false, // important so shared crosshair does not lag
        },
      },
      // If yAxis is already an array (multiple Y axes), use it directly; otherwise use getFormattedAxis
      yAxis: Array.isArray(yAxis) ? yAxis : getFormattedAxis(yAxis, format),
      animation: false,
      tooltip: {
        show: true,
        // ECharts tooltip content hidden by default since we use custom tooltip instead.
        // Stacked bar uses ECharts tooltip so subgroup data shows correctly.
        showContent: isStackedBar,
        trigger: isStackedBar ? 'item' : 'axis',
        appendToBody: isStackedBar,
      },
      // https://echarts.apache.org/en/option.html#axisPointer
      axisPointer: {
        type: 'line',
        z: 0, // ensure point symbol shows on top of dashed line
        triggerEmphasis: false, // https://github.com/apache/echarts/issues/18495
        triggerTooltip: false,
        snap: false, // xAxis.axisPointer.snap takes priority
      },
      toolbox: {
        feature: {
          dataZoom: {
            icon: null, // https://stackoverflow.com/a/67684076/17575201
            yAxisIndex: 'none',
          },
        },
      },
      grid,
    };

    if (__experimentalEChartsOptionsOverride) {
      return __experimentalEChartsOptionsOverride(option);
    }

    return option;
  }, [
    data,
    seriesMapping,
    annotationSeries,
    timeScale,
    yAxis,
    format,
    grid,
    noDataOption,
    __experimentalEChartsOptionsOverride,
    noDataVariant,
    isStackedBar,
    enablePinning,
    pinnedCrosshair,
    getTimezoneAwareAxisFormatter,
  ]);

  // Update adjacent charts so tooltip is unpinned when current chart is clicked.
  useEffect(() => {
    // Only allow pinning one tooltip at a time, subsequent tooltip click unpins previous.
    // Multiple tooltips can only be pinned if Ctrl or Cmd key is pressed while clicking.
    const multipleTooltipsPinned = tooltipPinnedCoords !== null && lastTooltipPinnedCoords !== null;
    if (multipleTooltipsPinned) {
      if (!isEqual(lastTooltipPinnedCoords, tooltipPinnedCoords)) {
        setTooltipPinnedCoords(null);
        if (tooltipPinnedCoords !== null && pinnedCrosshair !== null) {
          setPinnedCrosshair(null);
        }
      }
    }
    // tooltipPinnedCoords CANNOT be in dep array or tooltip pinning breaks in the current chart's onClick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastTooltipPinnedCoords, seriesMapping]);

  return (
    <Box
      style={{ height }}
      // onContextMenu={(e) => {
      //   // TODO: confirm tooltip pinning works correctly on Windows, should e.preventDefault() be added here
      //   e.preventDefault(); // Prevent the default behaviour when right clicked
      // }}
      onClick={(e) => {
        // Allows user to opt-in to multi tooltip pinning when Ctrl or Cmd key held down
        const isControlKeyPressed = e.ctrlKey || e.metaKey;
        if (isControlKeyPressed) {
          e.preventDefault();
        }

        // Determine where on chart canvas to plot pinned crosshair as markLine.
        const pointInGrid = getPointInGrid(e.nativeEvent.offsetX, e.nativeEvent.offsetY, chartRef.current);
        if (pointInGrid === null) {
          return;
        }

        // Pin and unpin when clicking on chart canvas but not tooltip text.
        if (isPinningEnabled && e.target instanceof HTMLCanvasElement) {
          // Pin tooltip and update shared charts context to remember these coordinates.
          const pinnedPos: CursorCoordinates = {
            page: {
              x: e.pageX,
              y: e.pageY,
            },
            client: {
              x: e.clientX,
              y: e.clientY,
            },
            plotCanvas: {
              x: e.nativeEvent.offsetX,
              y: e.nativeEvent.offsetY,
            },
            target: e.target,
          };

          setTooltipPinnedCoords((current) => {
            if (current === null) {
              return pinnedPos;
            } else {
              setPinnedCrosshair(null);
              return null;
            }
          });

          setPinnedCrosshair((current) => {
            // Only add pinned crosshair line series when there is not one already in seriesMapping.
            if (current === null) {
              const cursorX = pointInGrid[0];

              // Only need to loop through first dataset source since getCommonTimeScale ensures xAxis timestamps are consistent
              const firstTimeSeriesValues = data[0]?.values;
              const closestTimestamp = getClosestTimestamp(firstTimeSeriesValues, cursorX);

              // Crosshair snaps to nearest timestamp since cursor may be slightly to left or right
              const pinnedCrosshair = merge({}, DEFAULT_PINNED_CROSSHAIR, {
                markLine: {
                  data: [
                    {
                      xAxis: closestTimestamp,
                    },
                  ],
                },
              } as LineSeriesOption);
              return pinnedCrosshair;
            } else {
              // Clear previously set pinned crosshair
              return null;
            }
          });

          if (!isControlKeyPressed) {
            setLastTooltipPinnedCoords(pinnedPos);
          }
        }
      }}
      onMouseDown={(e) => {
        const { clientX } = e;
        setIsDragging(true);
        setStartX(clientX);
      }}
      onMouseMove={(e) => {
        // Allow clicking inside tooltip to copy labels.
        if (!(e.target instanceof HTMLCanvasElement)) {
          return;
        }
        const { clientX } = e;
        if (isDragging) {
          const deltaX = clientX - startX;
          if (deltaX > 0) {
            // Hide tooltip when user drags to zoom.
            setShowTooltip(false);
          }
        }
      }}
      onMouseUp={() => {
        setIsDragging(false);
        setStartX(0);
        setShowTooltip(true);
      }}
      onMouseLeave={() => {
        if (tooltipPinnedCoords === null) {
          setShowTooltip(false);
        }
        if (chartRef.current !== undefined) {
          clearHighlightedSeries(chartRef.current);
        }
      }}
      onMouseEnter={() => {
        setShowTooltip(true);
        if (chartRef.current !== undefined) {
          enableDataZoom(chartRef.current);
        }
      }}
      onDoubleClick={(e) => {
        setTooltipPinnedCoords(null);
        // either dispatch ECharts restore action to return to orig state or allow consumer to define behavior
        if (onDoubleClick === undefined) {
          if (chartRef.current !== undefined) {
            restoreChart(chartRef.current);
          }
        } else {
          onDoubleClick(e);
        }
      }}
    >
      {/* Allows overrides prop to hide custom tooltip and use the ECharts option.tooltip instead */}
      {showTooltip === true &&
        (option.tooltip as TooltipComponentOption)?.showContent === false &&
        tooltipConfig.hidden !== true && (
          <TimeChartTooltip
            containerId={chartsTheme.tooltipPortalContainerId}
            chartRef={chartRef}
            data={data}
            seriesMapping={seriesMapping}
            wrapLabels={tooltipConfig.wrapLabels}
            enablePinning={isPinningEnabled}
            pinnedPos={tooltipPinnedCoords}
            format={format}
            seriesFormatMap={seriesFormatMap}
            onUnpinClick={() => {
              // Unpins tooltip when clicking Pin icon in TooltipHeader.
              setTooltipPinnedCoords(null);
              // Clear previously set pinned crosshair.
              setPinnedCrosshair(null);
            }}
          />
        )}
      {/* Annotation tooltip */}
      {hoveredAnnotation && annotationTooltipPos && (
        <Portal
          container={
            chartsTheme.tooltipPortalContainerId
              ? document.querySelector(chartsTheme.tooltipPortalContainerId)
              : undefined
          }
        >
          <Box
            sx={{
              position: 'absolute',
              left: annotationTooltipPos.x + 10,
              top: annotationTooltipPos.y + 10,
              backgroundColor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider', // TODO: hoveredAnnotation.color || 'divider',
              borderRadius: 1,
              padding: 1.5,
              boxShadow: 3,
              zIndex: 1000,
              pointerEvents: 'none',
              minWidth: 180,
              maxWidth: 300,
            }}
          >
            {hoveredAnnotation.title && (
              <Box sx={{ fontWeight: 'bold', marginBottom: 0.5 /* TODO: hoveredAnnotation.color || 'divider' */ }}>
                {hoveredAnnotation.title}
              </Box>
            )}
            {hoveredAnnotation.legend && (
              <Box sx={{ marginBottom: 0.5, fontSize: '0.875rem' }}>{hoveredAnnotation.legend}</Box>
            )}
            <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', marginBottom: 0.5 }}>
              {new Date(hoveredAnnotation.start).toLocaleString()}
              {hoveredAnnotation.end && ` - ${new Date(hoveredAnnotation.end).toLocaleString()}`}
            </Box>
            {hoveredAnnotation.tags && Object.keys(hoveredAnnotation.tags).length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, marginTop: 0.5 }}>
                {Object.entries(hoveredAnnotation.tags).map(([key, value]) => (
                  <Box
                    key={key}
                    sx={{
                      backgroundColor: 'action.hover',
                      borderRadius: 0.5,
                      padding: '2px 6px',
                      fontSize: '0.7rem',
                      fontFamily: 'monospace',
                    }}
                  >
                    {key}: {value}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Portal>
      )}
      <EChart
        sx={{
          width: '100%',
          height: '100%',
        }}
        option={option}
        theme={chartsTheme.echartsTheme}
        onEvents={handleEvents}
        _instance={chartRef}
        syncGroup={enableSyncGrouping ? syncGroup : undefined}
      />
    </Box>
  );
});
