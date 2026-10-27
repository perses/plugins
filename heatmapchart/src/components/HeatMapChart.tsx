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

import { Box, useTheme } from '@mui/material';
import type { CursorCoordinates, FormatOptions, OnEventsType } from '@perses-dev/components';
import { EChart, ExemplarMetadataTooltip, formatValue, useChartsContext, useTimeZone } from '@perses-dev/components';
import type { Exemplar, Labels, TimeScale } from '@perses-dev/spec';
import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams, CustomSeriesRenderItemReturn } from 'echarts';
import { CustomChart, ScatterChart as EChartsScatterChart } from 'echarts/charts';
import type { ECharts as EChartsInstance, EChartsCoreOption } from 'echarts/core';
import { use as registerECharts } from 'echarts/core';
import isEqual from 'lodash/isEqual';
import type { ReactElement } from 'react';
import { useMemo, useRef, useState } from 'react';

import type { LOG_BASE } from '../heat-map-chart-model';
import { getFormattedHeatmapAxisLabel } from '../utils';
import type { HeatMapExemplarDataItem } from '../utils/data-transform';
import { EXEMPLAR_SERIES_ID_PREFIX, EXEMPLAR_SYMBOL_SIZE, getExemplarScatterSeries } from '../utils/data-transform';
import { generateTooltipHTML } from './HeatMapTooltip';

registerECharts([CustomChart, EChartsScatterChart]);

// The default coloring is a blue->yellow->red gradient
const DEFAULT_VISUAL_MAP_COLORS = [
  '#313695',
  '#4575b4',
  '#74add1',
  '#abd9e9',
  '#e0f3f8',
  '#ffffbf',
  '#fee090',
  '#fdae61',
  '#f46d43',
  '#d73027',
  '#a50026',
];

/**
 * Maximum pixel distance from an exemplar marker center for the cursor to count as still
 * hovering it (covers the full diamond bounding box, corners included).
 */
const EXEMPLAR_HOVER_RADIUS = (Math.SQRT2 * EXEMPLAR_SYMBOL_SIZE) / 2;

export type HeatMapData = [number, number, number, number | undefined]; // [xIndex, yLower, yUpper, count]

export interface HeatMapDataItem {
  value: HeatMapData;
  label: string;
  itemStyle?: {
    color?: string;
    borderColor?: string;
    borderWidth?: number;
  };
}

interface HoveredExemplar {
  exemplar: Exemplar;
  seriesLabels?: Labels;
  /** The point actually plotted: [xIndex, exemplar value]. */
  plotted: [number, number];
}

export interface HeatMapChartProps {
  width: number;
  height: number;
  data: HeatMapDataItem[];
  xAxisCategories: number[];
  /** Exemplar markers to render on top of the heatmap, if any. */
  exemplars?: HeatMapExemplarDataItem[];
  yAxisFormat?: FormatOptions;
  countFormat?: FormatOptions;
  countMin?: number;
  countMax?: number;
  timeScale?: TimeScale;
  showVisualMap?: boolean;
  min?: number;
  max?: number;
  logBase?: LOG_BASE;
}

export function HeatMapChart({
  width,
  height,
  data,
  xAxisCategories,
  exemplars,
  yAxisFormat,
  countFormat,
  countMin,
  countMax,
  timeScale,
  showVisualMap,
  min,
  max,
  logBase,
}: HeatMapChartProps): ReactElement | null {
  const { chartsTheme, enablePinning, lastTooltipPinnedCoords, setLastTooltipPinnedCoords } = useChartsContext();
  const theme = useTheme();
  const { timeZone } = useTimeZone();

  const chartRef = useRef<EChartsInstance>();
  const [hoveredExemplar, setHoveredExemplar] = useState<HoveredExemplar | null>(null);
  const [pinnedExemplar, setPinnedExemplar] = useState<HoveredExemplar | null>(null);
  const [pinnedExemplarPos, setPinnedExemplarPos] = useState<CursorCoordinates | null>(null);

  const exemplarSeries = useMemo(
    () => (exemplars !== undefined && exemplars.length > 0 ? getExemplarScatterSeries(exemplars) : undefined),
    [exemplars],
  );

  const handleEvents = useMemo<OnEventsType<unknown>>(() => {
    return {
      mouseover: (params): void => {
        if (
          params.componentType === 'series' &&
          params.seriesType === 'scatter' &&
          'seriesId' in params &&
          typeof params.seriesId === 'string' &&
          params.seriesId.startsWith(EXEMPLAR_SERIES_ID_PREFIX)
        ) {
          // This series ID identifies the metadata embedded by getExemplarScatterSeries.
          const point = params.data as { exemplar?: Exemplar; seriesLabels?: Labels; value?: [number, number] };
          if (point?.exemplar && point.value) {
            setHoveredExemplar({
              exemplar: point.exemplar,
              seriesLabels: point.seriesLabels,
              plotted: point.value,
            });
          }
          return;
        }
      },
      mouseout: (params): void => {
        if (
          params.componentType === 'series' &&
          params.seriesType === 'scatter' &&
          'seriesId' in params &&
          typeof params.seriesId === 'string' &&
          params.seriesId.startsWith(EXEMPLAR_SERIES_ID_PREFIX)
        ) {
          setHoveredExemplar(null);
        }
      },
      globalout: (): void => {
        // Cursor left the chart canvas — guarantee the exemplar tooltip is dismissed.
        setHoveredExemplar(null);
      },
    };
  }, []);

  const option: EChartsCoreOption = useMemo(() => {
    return {
      tooltip: {
        appendToBody: true,
        // Keep the tooltip inside the chart container: without confine, ECharts flips it over
        // the cursor when hovering near the edges, which covers the hovered tile and looks
        // like the tooltip jumps around (most visible on small windows).
        confine: true,
        formatter: (params: {
          data: HeatMapDataItem | HeatMapExemplarDataItem;
          marker: string;
          seriesId?: unknown;
        }): string => {
          // Exemplar markers are covered by their own ExemplarMetadataTooltip: hide the
          // regular heatmap tooltip for them (an empty string renders no tooltip).
          if (typeof params.seriesId === 'string' && params.seriesId.startsWith(EXEMPLAR_SERIES_ID_PREFIX)) {
            return '';
          }
          const item = params.data as HeatMapDataItem;
          return generateTooltipHTML({
            data: item.value,
            label: item.label,
            marker: params.marker,
            xAxisCategories,
            theme,
            yAxisFormat: yAxisFormat,
            countFormat: countFormat,
          });
        },
      },
      xAxis: {
        type: 'category',
        data: xAxisCategories,
        axisLabel: {
          hideOverlap: true,
          formatter: getFormattedHeatmapAxisLabel(timeScale?.rangeMs ?? 0, timeZone),
        },
      },
      yAxis: {
        type: logBase !== undefined ? 'log' : 'value',
        logBase: logBase,
        boundaryGap: [0, '10%'],
        min: min,
        max: max,
        axisLabel: {
          hideOverlap: true,
          formatter: (value: number): string => {
            // On log scales, ECharts may generate a tick at 0 which is mathematically
            // invalid (log(0) is undefined). Return empty string to hide such labels.
            if (logBase !== undefined && value === 0) {
              return '';
            }
            return formatValue(value, yAxisFormat);
          },
        },
      },
      visualMap: {
        show: showVisualMap ?? false,
        type: 'continuous',
        min: countMin,
        max: countMax,
        realtime: false,
        itemHeight: height - 30,
        itemWidth: 10,
        orient: 'vertical',
        left: 'right',
        top: 'center',
        inRange: {
          color: DEFAULT_VISUAL_MAP_COLORS,
        },
        textStyle: {
          color: theme.palette.text.primary,
          textBorderColor: theme.palette.background.default,
          textBorderWidth: 5,
        },
        // Color by the count dimension (index 3), and only the heatmap series: the
        // exemplar scatter series keeps its own white/diamond marker style.
        seriesIndex: 0,
        dimension: 3,
      },
      series: [
        {
          name: 'HeatMap',
          type: 'custom',
          renderItem: function (
            params: CustomSeriesRenderItemParams,
            api: CustomSeriesRenderItemAPI,
          ): CustomSeriesRenderItemReturn {
            const xIndex = api.value(0) as number;
            const yLower = api.value(1) as number;
            const yUpper = api.value(2) as number;

            // Pixel coordinates
            const upperStart = api.coord([xIndex, yUpper]);
            const lowerStart = api.coord([xIndex, yLower]);
            const upperNext = api.coord([xIndex + 1, yUpper]);

            const startX = upperStart?.[0];
            const upperY = upperStart?.[1];
            const lowerY = lowerStart?.[1];
            const nextX = upperNext?.[0];

            if (startX === undefined || upperY === undefined || lowerY === undefined || nextX === undefined) {
              return null;
            }

            const topY = Math.min(upperY, lowerY);
            const bottomY = Math.max(upperY, lowerY);
            const width = nextX - startX;
            const height = bottomY - topY;

            return {
              type: 'rect',
              shape: { x: startX, y: topY, width, height },
              style: {
                fill: api.visual('color'),
              },
            };
          },
          label: { show: false },
          dimensions: ['xIndex', 'yLower', 'yUpper', 'count'],
          encode: { x: 0, y: [1, 2], tooltip: [1, 2, 3] },
          data: data,
          progressive: 1000,
          animation: false,
        },
        ...(exemplarSeries !== undefined ? [exemplarSeries] : []),
      ],
    };
  }, [
    xAxisCategories,
    timeScale?.rangeMs,
    timeZone,
    yAxisFormat,
    showVisualMap,
    countMin,
    countMax,
    height,
    theme,
    data,
    countFormat,
    min,
    max,
    logBase,
    exemplarSeries,
  ]);

  const chart = useMemo(
    () => (
      <EChart
        style={{
          width: width,
          height: height,
        }}
        sx={{
          padding: `${chartsTheme.container.padding.default}px`,
        }}
        option={option}
        theme={chartsTheme.echartsTheme}
        onEvents={handleEvents}
        _instance={chartRef}
      />
    ),
    [chartsTheme.container.padding.default, chartsTheme.echartsTheme, height, option, width, handleEvents],
  );

  // A pinned exemplar tooltip is unpinned when a tooltip is pinned in another chart, unless
  // it is the one just pinned by this chart at these exact coordinates.
  const [previousLastTooltipPinnedCoords, setPreviousLastTooltipPinnedCoords] = useState(lastTooltipPinnedCoords);
  if (previousLastTooltipPinnedCoords !== lastTooltipPinnedCoords) {
    setPreviousLastTooltipPinnedCoords(lastTooltipPinnedCoords);
    if (
      pinnedExemplarPos !== null &&
      lastTooltipPinnedCoords !== null &&
      !isEqual(lastTooltipPinnedCoords, pinnedExemplarPos)
    ) {
      setPinnedExemplar(null);
      setPinnedExemplarPos(null);
    }
  }

  // Pinning can be turned off while an exemplar tooltip is pinned: only show it while allowed.
  const activePinnedExemplar = enablePinning ? pinnedExemplar : null;

  return (
    <Box
      onClick={(e) => {
        if (!enablePinning) {
          return;
        }

        // Allows the user to keep tooltips pinned in other charts when Ctrl or Cmd is held down.
        const isControlKeyPressed = e.ctrlKey || e.metaKey;

        if (hoveredExemplar !== null && e.target instanceof HTMLCanvasElement) {
          // Clicking while hovering an exemplar marker pins/unpins the exemplar tooltip.
          const pinnedPos: CursorCoordinates = {
            page: { x: e.pageX, y: e.pageY },
            client: { x: e.clientX, y: e.clientY },
            plotCanvas: { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY },
            target: e.target,
          };
          const isUnpinClick = pinnedExemplar !== null && pinnedExemplar.exemplar === hoveredExemplar.exemplar;
          // Compute the next state first and call the setters separately: updater functions
          // may run more than once (e.g. StrictMode), so they must stay side-effect free.
          setPinnedExemplar(isUnpinClick ? null : hoveredExemplar);
          setPinnedExemplarPos(isUnpinClick ? null : pinnedPos);
          if (!isUnpinClick && !isControlKeyPressed) {
            // Let adjacent charts know a tooltip is pinned at these coordinates, so only one
            // tooltip is pinned at a time.
            setLastTooltipPinnedCoords(pinnedPos);
          }
          return;
        }

        // Clicking elsewhere on the canvas unpins a pinned exemplar tooltip.
        if (pinnedExemplar !== null && e.target instanceof HTMLCanvasElement) {
          setPinnedExemplar(null);
          setPinnedExemplarPos(null);
        }
      }}
      onMouseMove={(e) => {
        if (!(e.target instanceof HTMLCanvasElement)) {
          return;
        }
        // ECharts does not reliably emit mouseout when the cursor moves off an exemplar
        // marker onto the plot area, which would keep the exemplar tooltip stuck on screen.
        // Clear the hovered exemplar as soon as the cursor is no longer within its marker.
        setHoveredExemplar((current) => {
          if (current === null || chartRef.current === undefined) return current;
          let markerPixel: number[] | undefined;
          try {
            markerPixel = chartRef.current.convertToPixel('grid', current.plotted);
          } catch {
            // Coordinates cannot be resolved (e.g. grid not ready yet), keep the current hover.
            return current;
          }
          const [markerPixelX, markerPixelY] = markerPixel ?? [];
          if (markerPixelX === undefined || markerPixelY === undefined) return current;
          const distance = Math.hypot(e.nativeEvent.offsetX - markerPixelX, e.nativeEvent.offsetY - markerPixelY);
          return distance <= EXEMPLAR_HOVER_RADIUS ? current : null;
        });
      }}
      onMouseLeave={() => {
        // Defensive: clear the hovered exemplar in case ECharts missed a mouseout event.
        setHoveredExemplar(null);
      }}
    >
      {/* Pinned exemplar takes priority over hovered. */}
      {(activePinnedExemplar !== null || hoveredExemplar !== null) && (
        <ExemplarMetadataTooltip
          exemplar={(activePinnedExemplar ?? hoveredExemplar)!.exemplar}
          seriesLabels={(activePinnedExemplar ?? hoveredExemplar)!.seriesLabels}
          containerId={chartsTheme.tooltipPortalContainerId}
          format={yAxisFormat}
          pinnedPos={activePinnedExemplar !== null ? pinnedExemplarPos : null}
          enablePinning={enablePinning}
          onUnpinClick={() => {
            setPinnedExemplar(null);
            setPinnedExemplarPos(null);
          }}
        />
      )}
      {chart}
    </Box>
  );
}
