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

import { ReactElement, useMemo } from 'react';
import { FormatOptions, TimeScale } from '@perses-dev/core';
import { EChart, getFormattedAxis, useChartsTheme, useTimeZone } from '@perses-dev/components';
import { use, EChartsCoreOption } from 'echarts/core';
import { CustomChart } from 'echarts/charts';
import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams } from 'echarts';
import { useTheme } from '@mui/material';
import { LOG_BASE } from '../heat-map-chart-model';
import { getFormattedHeatmapAxisLabel } from '../utils';
import { generateTooltipHTML } from './HeatMapTooltip';

use([CustomChart]);

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

export interface HeatMapChartProps {
  width: number;
  height: number;
  data: HeatMapDataItem[];
  xAxisCategories: number[];
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
  const chartsTheme = useChartsTheme();
  const theme = useTheme();
  const { timeZone } = useTimeZone();

  const option: EChartsCoreOption = useMemo(() => {
    return {
      tooltip: {
        appendToBody: true,
        formatter: (params: { data: HeatMapDataItem; marker: string }) => {
          return generateTooltipHTML({
            data: params.data.value,
            label: params.data.label,
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
      yAxis: getFormattedAxis(
        {
          type: logBase !== undefined ? 'log' : 'value',
          logBase: logBase,
          min: min,
          max: max,
        },
        yAxisFormat
      ),
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
        // Color by the count dimension (index 3)
        dimension: 3,
      },
      series: [
        {
          name: 'HeatMap',
          type: 'custom',
          renderItem: function (params: CustomSeriesRenderItemParams, api: CustomSeriesRenderItemAPI) {
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
      />
    ),
    [chartsTheme.container.padding.default, chartsTheme.echartsTheme, height, option, width]
  );

  return <>{chart}</>;
}
