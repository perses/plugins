// Copyright 2025 The Perses Authors
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
import { HeatmapChart as EChartsHeatmapChart } from 'echarts/charts';
import { useTheme } from '@mui/material';
import { getFormattedHeatmapAxisLabel } from '../utils';
import { generateTooltipHTML } from './HeatMapTooltip';

use([EChartsHeatmapChart]);

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

export type HeatMapData = [number, number, number | undefined]; // [x, y, value]

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
  yAxisCategories: string[];
  yAxisFormat?: FormatOptions;
  countFormat?: FormatOptions;
  countMin?: number;
  countMax?: number;
  timeScale?: TimeScale;
  showVisualMap?: boolean;
  // TODO: exponential?: boolean;
}

export function HeatMapChart({
  width,
  height,
  data,
  xAxisCategories,
  yAxisCategories,
  yAxisFormat,
  countFormat,
  countMin,
  countMax,
  timeScale,
  showVisualMap,
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
            yAxisCategories,
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
          type: 'category',
          data: yAxisCategories,
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
      },
      series: [
        {
          name: 'Gaussian',
          type: 'heatmap',
          data: data,
          emphasis: {
            itemStyle: {
              borderColor: '#333',
              borderWidth: 1,
            },
          },
          progressive: 1000,
          animation: false,
        },
      ],
    };
  }, [
    xAxisCategories,
    timeScale?.rangeMs,
    timeZone,
    yAxisCategories,
    yAxisFormat,
    showVisualMap,
    countMin,
    countMax,
    height,
    theme,
    data,
    countFormat,
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
