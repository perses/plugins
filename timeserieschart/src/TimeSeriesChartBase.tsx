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

import { Box } from '@mui/material';
import type {
  ChartInstance,
  ChartInstanceFocusOpts,
  CursorCoordinates,
  FormatOptions,
  OnEventsType,
  TimeChartSeriesMapping,
  TooltipConfig,
  ZoomEventData,
} from '@perses-dev/components';
import {
  clearHighlightedSeries,
  DEFAULT_PINNED_CROSSHAIR,
  DEFAULT_TOOLTIP_CONFIG,
  EChart,
  enableDataZoom,
  ExemplarMetadataTooltip,
  getClosestTimestamp,
  getCommonTimeScale,
  getFormattedAxis,
  getPointInGrid,
  restoreChart,
  TimeChartTooltip,
  useChartsContext,
  useTimeZone,
} from '@perses-dev/components';
import type { Exemplar, Labels, TimeScale, TimeSeries } from '@perses-dev/spec';
import type {
  DatasetComponentOption as DatasetOption,
  EChartsCoreOption,
  GridComponentOption,
  LineSeriesOption,
  YAXisComponentOption,
  TooltipComponentOption,
} from 'echarts';
import {
  LineChart as EChartsLineChart,
  BarChart as EChartsBarChart,
  ScatterChart as EChartsScatterChart,
} from 'echarts/charts';
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
import type { ECharts as EChartsInstance } from 'echarts/core';
import { use as registerECharts } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import isEqual from 'lodash/isEqual';
import merge from 'lodash/merge';
import type { MouseEvent } from 'react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

import { AnnotationTooltip, buildAnnotationSeries } from './annotations/AnnotationTooltip';
import type { TimeSeriesAnnotation } from './utils/annotation';
import type { ExemplarChartData } from './utils/data-transform';
import { EXEMPLAR_SERIES_ID_PREFIX, EXEMPLAR_SYMBOL_SIZE, getExemplarSeries } from './utils/data-transform';
import { createTimezoneAwareAxisFormatter } from './utils/timezone-formatter';

registerECharts([
  EChartsLineChart,
  EChartsBarChart,
  EChartsScatterChart,
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

interface HoveredExemplar {
  exemplar: Exemplar;
  seriesLabels?: Labels;
}

/**
 * Maximum pixel distance from an exemplar marker center for the cursor to count as still
 * hovering it (covers the full diamond bounding box, corners included).
 */
const EXEMPLAR_HOVER_RADIUS = (Math.SQRT2 * EXEMPLAR_SYMBOL_SIZE) / 2;

export interface TimeChartProps {
  height: number;
  data: TimeSeries[];
  seriesMapping: TimeChartSeriesMapping;
  exemplars?: ExemplarChartData[];
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
    exemplars,
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
  ref,
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
  const [hoveredExemplar, setHoveredExemplar] = useState<HoveredExemplar | null>(null);
  const [pinnedExemplar, setPinnedExemplar] = useState<HoveredExemplar | null>(null);
  const [pinnedExemplarPos, setPinnedExemplarPos] = useState<CursorCoordinates | null>(null);
  const [pinnedAnnotationPos, setPinnedAnnotationPos] = useState<CursorCoordinates | null>(null);
  const { timeZone, formatWithUserTimeZone } = useTimeZone();

  const getTimezoneAwareAxisFormatter = useCallback(
    (rangeMs: number): ((value: number) => string) => createTimezoneAwareAxisFormatter(rangeMs, timeZone),
    [timeZone],
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
        if (
          params.componentType === 'series' &&
          params.seriesType === 'scatter' &&
          typeof params.seriesId === 'string' &&
          params.seriesId.startsWith(EXEMPLAR_SERIES_ID_PREFIX)
        ) {
          if (params.data?.exemplar) {
            setHoveredExemplar({ exemplar: params.data.exemplar, seriesLabels: params.data.seriesLabels });
            return;
          }
        }
        setHoveredExemplar(null);
        // Only markPoint (triangles under the X-axis) opens the annotation tooltip.
        // Hovering markLine or anything else keeps the regular TimeSeries tooltip visible
        // and clears any stale hovered annotation (mouseout is sometimes missed by ECharts).
        if (annotations && params.componentType === 'markPoint' && params.data?.annotationIndex !== undefined) {
          const matchedAnnotation = annotations[params.data.annotationIndex] || null;
          if (matchedAnnotation) {
            setHoveredAnnotation(matchedAnnotation);
            return;
          }
        }
        setHoveredAnnotation(null);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mouseout: (params: any): void => {
        if (
          params.componentType === 'series' &&
          params.seriesType === 'scatter' &&
          typeof params.seriesId === 'string' &&
          params.seriesId.startsWith(EXEMPLAR_SERIES_ID_PREFIX)
        ) {
          setHoveredExemplar(null);
          return;
        }
        if (
          annotations &&
          params.componentType === 'markPoint' &&
          params.data?.annotationIndex !== undefined &&
          annotations
        ) {
          // Only clear if the mouseout corresponds to the currently hovered annotation, so that
          // a quick move from one markPoint to another isn't cancelled by a late mouseout event.
          const leaving = annotations[params.data.annotationIndex] || null;
          setHoveredAnnotation((current) => (current === leaving ? null : current));
        }
      },
      globalout: (): void => {
        if (annotations) {
          // Cursor left the chart canvas — guarantee the annotation tooltip is dismissed.
          setHoveredAnnotation(null);
        }
        setHoveredExemplar(null);
      },
    };
  }, [annotations, onDataZoom]);

  // Generate annotation series for ECharts markArea (range), markLine (point), and markPoint (markers under X-axis)
  const annotationSeries = useMemo(() => buildAnnotationSeries(annotations), [annotations]);

  const exemplarSeries = useMemo(() => exemplars?.map(getExemplarSeries) ?? [], [exemplars]);

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
        ? [...seriesMapping, pinnedCrosshair, ...annotationSeries, ...exemplarSeries]
        : [...seriesMapping, ...annotationSeries, ...exemplarSeries];

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
    exemplarSeries,
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
    // A pinned exemplar tooltip is also unpinned when a tooltip is pinned in another chart,
    // unless it is the one just pinned by this chart at these exact coordinates.
    if (
      pinnedExemplarPos !== null &&
      lastTooltipPinnedCoords !== null &&
      !isEqual(lastTooltipPinnedCoords, pinnedExemplarPos)
    ) {
      setPinnedExemplar(null);
      setPinnedExemplarPos(null);
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

        // If clicking while hovering an exemplar marker, toggle the exemplar tooltip pin
        // instead of pinning the TimeChartTooltip. Pinning an exemplar tooltip unpins the
        // pinned TimeChartTooltip, so only one tooltip stays pinned at a time unless
        // Ctrl or Cmd is held down.
        if (hoveredExemplar !== null && e.target instanceof HTMLCanvasElement) {
          const pinnedPos: CursorCoordinates = {
            page: { x: e.pageX, y: e.pageY },
            client: { x: e.clientX, y: e.clientY },
            plotCanvas: { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY },
            target: e.target,
          };
          const isUnpinClick = pinnedExemplar !== null && pinnedExemplar.exemplar === hoveredExemplar.exemplar;
          setPinnedExemplar((current) => {
            if (current !== null && current.exemplar === hoveredExemplar.exemplar) {
              setPinnedExemplarPos(null);
              return null;
            }
            setPinnedExemplarPos(pinnedPos);
            return hoveredExemplar;
          });
          if (!isUnpinClick && !isControlKeyPressed) {
            // Unpin the pinned TimeChartTooltip and let adjacent charts know a tooltip is
            // pinned at these coordinates, so only one tooltip is pinned at a time.
            setTooltipPinnedCoords(null);
            setPinnedCrosshair(null);
            setLastTooltipPinnedCoords(pinnedPos);
          }
          return;
        }

        // Unpin a pinned exemplar tooltip when clicking elsewhere on the chart canvas,
        // so the same click can pin the TimeChartTooltip instead. Ctrl or Cmd keeps both.
        if (pinnedExemplar !== null && !isControlKeyPressed && e.target instanceof HTMLCanvasElement) {
          setPinnedExemplar(null);
          setPinnedExemplarPos(null);
        }

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
        // ECharts does not reliably emit mouseout when the cursor moves off an exemplar marker
        // onto the plain plot area, which would keep the exemplar tooltip stuck on screen and
        // hide the regular TimeChartTooltip. Clear the hovered exemplar as soon as the cursor
        // is no longer within its marker, so the next hover can take over.
        setHoveredExemplar((current) => {
          if (current === null || chartRef.current === undefined) return current;
          let markerPixel: number[] | undefined;
          try {
            markerPixel = chartRef.current.convertToPixel('grid', [current.exemplar.timestamp, current.exemplar.value]);
          } catch {
            // Coordinates cannot be resolved (e.g. grid not ready yet), keep the current hover.
            return current;
          }
          const [markerPixelX, markerPixelY] = markerPixel ?? [];
          if (markerPixelX === undefined || markerPixelY === undefined) return current;
          const distance = Math.hypot(e.nativeEvent.offsetX - markerPixelX, e.nativeEvent.offsetY - markerPixelY);
          return distance <= EXEMPLAR_HOVER_RADIUS ? current : null;
        });
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
        // Defensive: clear hovered annotation and exemplar in case ECharts missed a mouseout event.
        setHoveredAnnotation(null);
        setHoveredExemplar(null);
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
          Keep the time chart tooltip visible when pinned even if user hovers an annotation or exemplar,
          but do not show the mouse-following tooltip on top of a pinned exemplar tooltip. */}
      {showTooltip === true &&
        (tooltipPinnedCoords !== null ||
          (pinnedExemplar === null && hoveredAnnotation === null && hoveredExemplar === null)) &&
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
      {/* Pinned exemplar takes priority over hovered. While a TimeChartTooltip is pinned, the
          mouse-following exemplar tooltip is not rendered so it does not appear on top of it. */}
      {(pinnedExemplar !== null || (hoveredExemplar !== null && tooltipPinnedCoords === null)) && (
        <ExemplarMetadataTooltip
          exemplar={(pinnedExemplar ?? hoveredExemplar)!.exemplar}
          seriesLabels={(pinnedExemplar ?? hoveredExemplar)!.seriesLabels}
          containerId={chartsTheme.tooltipPortalContainerId}
          format={format}
          pinnedPos={pinnedExemplar !== null ? pinnedExemplarPos : null}
          enablePinning={isPinningEnabled}
          onUnpinClick={() => {
            setPinnedExemplar(null);
            setPinnedExemplarPos(null);
          }}
        />
      )}
      {/* Pinned annotation takes priority over hovered. */}
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
