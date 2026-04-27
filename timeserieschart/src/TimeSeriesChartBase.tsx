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
import { Box, Divider, Portal, Stack, Typography } from '@mui/material';
import Pin from 'mdi-material-ui/Pin';
import PinOutline from 'mdi-material-ui/PinOutline';
import useResizeObserver from 'use-resize-observer';
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
  assembleTransform,
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
  getTooltipStyles,
  OnEventsType,
  PIN_TOOLTIP_HELP_TEXT,
  restoreChart,
  TimeChartSeriesMapping,
  TimeChartTooltip,
  TOOLTIP_BG_COLOR_FALLBACK,
  TOOLTIP_MAX_WIDTH,
  TooltipConfig,
  UNPIN_TOOLTIP_HELP_TEXT,
  useChartsContext,
  useMousePosition,
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
    annotations,
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
  const [pinnedAnnotation, setPinnedAnnotation] = useState<TimeSeriesAnnotation | null>(null);
  const [pinnedAnnotationPos, setPinnedAnnotationPos] = useState<CursorCoordinates | null>(null);
  const { timeZone, formatWithUserTimeZone } = useTimeZone();

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
        // Handle annotation hover for markPoint (triangles under X-axis) and markLine (vertical dashed lines)
        if (
          annotations &&
          (params.componentType === 'markPoint' || params.componentType === 'markLine') &&
          params.data?.annotationIndex !== undefined
        ) {
          const annotationIndex = params.data.annotationIndex;
          const matchedAnnotation = annotations[annotationIndex] || null;
          if (matchedAnnotation) {
            setHoveredAnnotation(matchedAnnotation);
          }
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mouseout: (params: any): void => {
        if (
          (params.componentType === 'markPoint' || params.componentType === 'markLine') &&
          params.data?.annotationIndex !== undefined
        ) {
          setHoveredAnnotation(null);
        }
      },
    };
  }, [annotations, onDataZoom]);

  // Generate annotation series for ECharts markArea (range), markLine (point), and markPoint (markers under X-axis)
  const annotationSeries = useMemo(() => {
    //const annotations = DUMMY_ANNOTATIONS; // Using dummy annotations for testing
    if (!annotations || annotations.length === 0) return [];

    const markAreaData: Array<[{ xAxis: number; itemStyle?: { color: string; opacity: number } }, { xAxis: number }]> =
      [];
    const markLineData: Array<{
      xAxis: number;
      lineStyle?: { color: string; width: number; type: 'dashed' | 'solid' | 'dotted' };
      label?: { show: boolean };
      annotationIndex?: number;
    }> = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const markPointData: any[] = [];

    annotations.forEach((annotation, index) => {
      const color = annotation.color ?? '#FF6B6B';
      const opacity = 0.3;

      if (annotation.end !== undefined) {
        // Range annotation - use markArea and markLine (silent) + markers at start/end
        markLineData.push({
          xAxis: annotation.start,
          lineStyle: { color, width: 2, type: 'dashed' as const },
          label: { show: false },
          annotationIndex: index,
        });

        markLineData.push({
          xAxis: annotation.end,
          lineStyle: { color, width: 2, type: 'dashed' as const },
          label: { show: false },
          annotationIndex: index,
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
          symbolSize: [12, 12],
          symbolRotate: 0,
          symbolOffset: [0, 4], // Position below X-axis
          itemStyle: { color },
          annotationIndex: index,
          emphasis: {
            disabled: true,
          },
          isStart: true,
        });

        // Add end marker
        markPointData.push({
          coord: [annotation.end, 0],
          symbol: 'triangle',
          symbolSize: [12, 12],
          symbolRotate: 0,
          symbolOffset: [0, 4], // Position below X-axis
          itemStyle: { color },
          annotationIndex: index,
          emphasis: {
            disabled: true,
          },
          isEnd: true,
        });
      } else {
        // Point annotation - use markLine (silent) + single marker
        markLineData.push({
          xAxis: annotation.start,
          lineStyle: { color, width: 2, type: 'dashed' as const },
          label: { show: false },
          annotationIndex: index,
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
              silent: false, // Interactive so vertical line hover opens annotation tooltip
              symbol: ['none', 'none'],
              data: markLineData,
              lineStyle: {
                type: 'dashed',
              },
              emphasis: {
                disabled: true,
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
  }, [annotations]);

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
        // If clicking while hovering an annotation, toggle the annotation tooltip pin
        // instead of pinning the TimeChartTooltip, so pinned TimeChartTooltip is preserved.
        if (hoveredAnnotation !== null && e.target instanceof HTMLCanvasElement) {
          const pinnedPos: CursorCoordinates = {
            page: { x: e.pageX, y: e.pageY },
            client: { x: e.clientX, y: e.clientY },
            plotCanvas: { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY },
            target: e.target,
          };
          setPinnedAnnotation((current) => {
            if (current === hoveredAnnotation) {
              setPinnedAnnotationPos(null);
              return null;
            }
            setPinnedAnnotationPos(pinnedPos);
            return hoveredAnnotation;
          });
          return;
        }

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
      {/* Allows overrides prop to hide custom tooltip and use the ECharts option.tooltip instead.
          Keep the time chart tooltip visible when pinned even if user hovers an annotation. */}
      {showTooltip === true &&
        (tooltipPinnedCoords !== null || hoveredAnnotation === null) &&
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
      {/* Annotation tooltip - reuses TimeChartTooltip styling. Pinned takes priority over hovered. */}
      {(pinnedAnnotation ?? hoveredAnnotation) && (
        <AnnotationTooltip
          annotation={(pinnedAnnotation ?? hoveredAnnotation) as TimeSeriesAnnotation}
          containerId={chartsTheme.tooltipPortalContainerId}
          formatWithUserTimeZone={formatWithUserTimeZone}
          pinnedPos={pinnedAnnotation !== null ? pinnedAnnotationPos : null}
          enablePinning={isPinningEnabled}
          onUnpinClick={() => {
            setPinnedAnnotation(null);
            setPinnedAnnotationPos(null);
          }}
        />
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

interface AnnotationTooltipProps {
  annotation: TimeSeriesAnnotation;
  containerId?: string;
  formatWithUserTimeZone: (date: Date, formatString: string) => string;
  pinnedPos: CursorCoordinates | null;
  enablePinning?: boolean;
  onUnpinClick?: () => void;
}

function AnnotationTooltip({
  annotation,
  containerId,
  formatWithUserTimeZone,
  pinnedPos,
  enablePinning = true,
  onUnpinClick,
}: AnnotationTooltipProps): JSX.Element | null {
  const mousePos = useMousePosition();
  const { height, width, ref: tooltipRef } = useResizeObserver<HTMLDivElement>();

  const isPinned = pinnedPos !== null;
  if (!isPinned && mousePos === null) return null;

  const containerElement = containerId ? document.querySelector(containerId) : undefined;
  const maxHeight = containerElement ? containerElement.getBoundingClientRect().height : undefined;
  const transform = assembleTransform(mousePos, pinnedPos, height ?? 0, width ?? 0, containerElement);

  const formatDate = (timeMs: number): { date: string; time: string } => {
    const d = new Date(timeMs);
    return {
      date: formatWithUserTimeZone(d, 'MMM dd, yyyy'),
      time: formatWithUserTimeZone(d, 'HH:mm:ss'),
    };
  };

  const start = formatDate(annotation.start);
  const end = annotation.end !== undefined ? formatDate(annotation.end) : null;

  return (
    <Portal container={containerElement}>
      <Box ref={tooltipRef} sx={(theme) => getTooltipStyles(theme, pinnedPos, maxHeight)} style={{ transform }}>
        <Stack spacing={0.5}>
          <Box
            sx={(theme) => ({
              width: '100%',
              maxWidth: TOOLTIP_MAX_WIDTH,
              padding: theme.spacing(1.5, 2, 0.5, 2),
              backgroundColor: theme.palette.designSystem?.grey[800] ?? TOOLTIP_BG_COLOR_FALLBACK,
              position: 'sticky',
              top: 0,
              left: 0,
            })}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', paddingBottom: 0.5, width: '100%' }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: annotation.color ?? '#FF6B6B',
                  marginRight: 1,
                  flexShrink: 0,
                }}
              />
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="caption">
                  {start.date} - <strong>{start.time}</strong>
                </Typography>
                {end && (
                  <>
                    <Typography variant="caption">{' → '}</Typography>
                    <Typography variant="caption">
                      {end.date} - <strong>{end.time}</strong>
                    </Typography>
                  </>
                )}
              </Box>
              {enablePinning && (
                <Stack direction="row" alignItems="center" sx={{ marginLeft: 1, flexShrink: 0 }}>
                  <Typography sx={{ marginRight: 0.5, fontSize: 11, verticalAlign: 'middle' }}>
                    {isPinned ? UNPIN_TOOLTIP_HELP_TEXT : PIN_TOOLTIP_HELP_TEXT}
                  </Typography>
                  {isPinned ? (
                    <Pin
                      onClick={() => {
                        if (onUnpinClick !== undefined) onUnpinClick();
                      }}
                      sx={{ fontSize: 16, cursor: 'pointer' }}
                    />
                  ) : (
                    <PinOutline sx={{ fontSize: 16 }} />
                  )}
                </Stack>
              )}
            </Box>
            <Divider sx={(theme) => ({ width: '100%', borderColor: theme.palette.grey['500'] })} />
          </Box>
          <Box sx={(theme) => ({ padding: theme.spacing(0.5, 2, 1.5, 2) })}>
            {annotation.title && (
              <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', marginBottom: 0.5 }}>
                {annotation.title}
              </Typography>
            )}
            {annotation.legend && (
              <Typography variant="caption" sx={{ display: 'block', marginBottom: 0.5 }}>
                {annotation.legend}
              </Typography>
            )}
            {annotation.tags && Object.keys(annotation.tags).length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, marginTop: 0.5 }}>
                {Object.entries(annotation.tags).map(([key, value]) => (
                  <Box
                    key={key}
                    sx={(theme) => ({
                      backgroundColor: theme.palette.grey['700'],
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontSize: '0.7rem',
                      fontFamily: 'monospace',
                    })}
                  >
                    {key}: {value}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Stack>
      </Box>
    </Portal>
  );
}
