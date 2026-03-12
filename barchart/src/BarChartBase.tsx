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
import { EChart, ModeOption, getFormattedAxis, useChartsTheme } from '@perses-dev/components';
import { FormatOptions, formatValue } from '@perses-dev/core';
import { use, EChartsCoreOption } from 'echarts/core';
import { BarChart as EChartsBarChart } from 'echarts/charts';
import { GridComponent, DatasetComponent, TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { Box } from '@mui/material';

use([
  EChartsBarChart,
  GridComponent,
  DatasetComponent,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);

const BAR_WIN_WIDTH = 14;
const BAR_GAP = 6;
const LEGEND_HEIGHT = 20;

export interface BarChartData {
  label: string;
  value: number | null;
}

export interface StackedBarChartSeries {
  name: string;
  values: Array<number | null>;
}

export interface StackedBarChartData {
  categories: string[];
  series: StackedBarChartSeries[];
}

export interface BarChartBaseProps {
  width: number;
  height: number;
  data: BarChartData[] | null;
  format?: FormatOptions;
  mode?: ModeOption;
  groupedData?: StackedBarChartData | null;
  isStacked?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export function BarChartBase(props: BarChartBaseProps): ReactElement {
  const {
    width,
    height,
    data,
    format = { unit: 'decimal' },
    mode = 'value',
    groupedData,
    isStacked = false,
    orientation = 'horizontal',
  } = props;
  const chartsTheme = useChartsTheme();
  const isHorizontal = orientation === 'horizontal';

  const option: EChartsCoreOption = useMemo(() => {
    if (groupedData) {
      if (!groupedData.series.length || !groupedData.categories.length) return chartsTheme.noDataOption;
      const { categories, series } = groupedData;
      return {
        title: { show: false },
        legend: { type: 'scroll', show: true, bottom: 0 },
        xAxis: isHorizontal
          ? getFormattedAxis({}, format)
          : {
              type: 'category',
              data: categories,
              splitLine: { show: false },
              axisLabel: { overflow: 'truncate', width: width / 3 },
            },
        yAxis: isHorizontal
          ? {
              type: 'category',
              data: categories,
              splitLine: { show: false },
              axisLabel: { overflow: 'truncate', width: width / 3 },
            }
          : getFormattedAxis({}, format),
        series: series.map((s) => ({
          name: s.name,
          type: 'bar',
          stack: isStacked ? 'total' : undefined,
          data: s.values,
          label: { show: false },
          itemStyle: { borderRadius: isStacked ? 0 : 4 },
        })),
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          appendToBody: true,
          confine: true,
          formatter: (
            params: Array<{ seriesName: string; data: number | null; name: string; color: string }>
          ): string => {
            if (!params.length) return '';
            const header = `<b>${params[0]!.name}</b><br/>`;
            const rows = params
              .filter((p) => p.data !== null)
              .map(
                (p) =>
                  `<span style="display:inline-block;margin-right:5px;border-radius:50%;width:10px;height:10px;background-color:${p.color}"></span>` +
                  `${p.seriesName}: <b>${formatValue(p.data as number, format)}</b>`
              )
              .join('<br/>');
            return header + rows;
          },
        },
        grid: { left: '5%', right: '5%', bottom: LEGEND_HEIGHT * 2 },
      };
    }

    if (!data || !data.length) return chartsTheme.noDataOption;

    const source: Array<Array<BarChartData['label'] | BarChartData['value']>> = [];
    data.map((d) => {
      source.push([d.label, d.value]);
    });

    return {
      title: {
        show: false,
      },
      dataset: [
        {
          dimensions: ['label', 'value'],
          source: source,
        },
      ],
      xAxis: isHorizontal
        ? getFormattedAxis({}, format)
        : { type: 'category', splitLine: { show: false }, axisLabel: { overflow: 'truncate', width: width / 3 } },
      yAxis: isHorizontal
        ? { type: 'category', splitLine: { show: false }, axisLabel: { overflow: 'truncate', width: width / 3 } }
        : getFormattedAxis({}, format),
      series: {
        type: 'bar',
        barMinWidth: BAR_WIN_WIDTH,
        barCategoryGap: BAR_GAP,
        label: {
          show: true,
          position: isHorizontal ? 'right' : 'top',
          formatter: (params: { data: number[] }): string | undefined => {
            if (!params.data[1]) {
              return undefined;
            }

            if (mode === 'percentage') {
              return formatValue(params.data[1]!, {
                unit: 'percent',
                decimalPlaces: format.decimalPlaces,
              });
            }
            return formatValue(params.data[1], format);
          },
        },
        itemStyle: {
          borderRadius: 4,
          color: chartsTheme.echartsTheme[0],
        },
      },
      tooltip: {
        appendToBody: true,
        confine: true,
        formatter: (params: { name: string; data: number[] }) =>
          params.data[1] && `<b>${params.name}</b> &emsp; ${formatValue(params.data[1], format)}`,
      },
      // increase distance between grid and container to prevent y axis labels from getting cut off
      grid: {
        left: '5%',
        right: '5%',
      },
    };
  }, [data, groupedData, isStacked, chartsTheme, width, mode, format, isHorizontal]);

  const numGroupedRows = groupedData
    ? isStacked
      ? groupedData.categories.length
      : groupedData.categories.length * groupedData.series.length
    : 0;

  return (
    <Box
      style={{
        width: width,
        height: height,
      }}
      sx={{ overflow: 'auto' }}
    >
      <EChart
        style={{
          minHeight: height,
          height: groupedData
            ? isHorizontal
              ? Math.max(height, numGroupedRows * (BAR_WIN_WIDTH + BAR_GAP) + LEGEND_HEIGHT * 2 + 20)
              : height
            : data
              ? data.length * (BAR_WIN_WIDTH + BAR_GAP)
              : '100%',
        }}
        option={option}
        theme={chartsTheme.echartsTheme}
      />
    </Box>
  );
}
