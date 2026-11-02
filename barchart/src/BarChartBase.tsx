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

import { Box, Link } from '@mui/material';
import type { FormatOptions, ModeOption } from '@perses-dev/components';
import { EChart, formatValue, getFormattedAxis, useChartsTheme } from '@perses-dev/components';
import { BarChart as EChartsBarChart } from 'echarts/charts';
import { GridComponent, DatasetComponent, TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import type { ECharts, EChartsCoreOption } from 'echarts/core';
import { use as registerECharts } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import type { ReactElement } from 'react';
import { useMemo, useRef, useState } from 'react';

import type { ColorOverride } from './bar-chart-model';
import { getOverrideColor } from './utils';

registerECharts([
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
// HTML category column that replaces the canvas axis labels.
// 7px is the average advance of the 12px link font.
const MAX_LABEL_COLUMN_RATIO = 0.5;
const MIN_LABEL_COLUMN_PX = 96;
const PX_PER_LABEL_CHAR = 7;
const LABEL_COLUMN_PADDING_PX = 16;
const LABEL_LINK_FONT_PX = 12;
const LABEL_TEXT_INSET_PX = 12;

export interface BarChartData {
  label: string;
  value: number | null;
  href?: string;
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
  colorOverrides?: ColorOverride[];
  linkTargetBlank?: boolean;
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
    colorOverrides,
    linkTargetBlank = false,
  } = props;
  const chartsTheme = useChartsTheme();
  const isHorizontal = orientation === 'horizontal';
  const labelColumn = useMemo(() => {
    if (!isHorizontal || !data?.some((item) => item.href)) {
      return 0;
    }
    const longest = data.reduce((n, item) => Math.max(n, item.label.length), 0);
    return Math.min(
      width * MAX_LABEL_COLUMN_RATIO,
      Math.max(MIN_LABEL_COLUMN_PX, longest * PX_PER_LABEL_CHAR + LABEL_COLUMN_PADDING_PX),
    );
  }, [data, isHorizontal, width]);

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
        series: series.map((s) => {
          const overrideColor = getOverrideColor(s.name, colorOverrides);
          return {
            name: s.name,
            type: 'bar',
            stack: isStacked ? 'total' : undefined,
            data: s.values,
            label: { show: false },
            itemStyle: {
              borderRadius: isStacked ? 0 : 4,
              ...(overrideColor ? { color: overrideColor } : {}),
            },
          };
        }),
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          appendToBody: true,
          confine: true,
          formatter: (
            params: Array<{ seriesName: string; data: number | null; name: string; color: string }>,
          ): string => {
            if (!params.length) return '';
            const header = `<b>${params[0]?.name}</b><br/>`;
            const rows = params
              .filter((p): p is typeof p & { data: number } => p.data !== null)
              .map(
                (p) =>
                  `<span style="display:inline-block;margin-right:5px;border-radius:50%;width:10px;height:10px;background-color:${p.color}"></span>` +
                  `${p.seriesName}: <b>${formatValue(p.data, format)}</b>`,
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
        ? {
            type: 'category',
            splitLine: { show: false },
            axisLabel: labelColumn > 0 ? { show: false } : { overflow: 'truncate', width: width / 3 },
          }
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
          color: (params: { name: string }): string => {
            const overrideColor = getOverrideColor(params.name, colorOverrides);
            if (overrideColor) return overrideColor;
            const palette = chartsTheme.echartsTheme.color as string[] | undefined;
            return palette?.[0] ?? '';
          },
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
        left: labelColumn > 0 ? labelColumn : '5%',
        right: '5%',
        ...(labelColumn > 0 ? { top: 8, bottom: 8 } : {}),
      },
    };
  }, [data, groupedData, isStacked, chartsTheme, width, mode, format, isHorizontal, colorOverrides, labelColumn]);

  let numGroupedRows = 0;
  if (groupedData) {
    numGroupedRows = groupedData.categories.length;
    if (!isStacked) {
      numGroupedRows *= groupedData.series.length;
    }
  }

  function getChartHeight(): number | string {
    if (groupedData) {
      if (!isHorizontal) return height;
      return Math.max(height, numGroupedRows * (BAR_WIN_WIDTH + BAR_GAP) + LEGEND_HEIGHT * 2 + 20);
    }
    if (data) {
      return data.length * (BAR_WIN_WIDTH + BAR_GAP);
    }
    return '100%';
  }

  const [labelYs, setLabelYs] = useState<number[]>([]);
  const chartRef = useRef<ECharts | undefined>(undefined);
  const chartHeight = getChartHeight();

  function placeLinks(chart: ECharts): void {
    if (!data || labelColumn === 0) {
      return;
    }
    const next = data.map((item) => {
      const y = chart.convertToPixel({ yAxisIndex: 0 }, item.label);
      return typeof y === 'number' ? y : Number.NaN;
    });
    setLabelYs((prev) => (prev.length === next.length && prev.every((y, i) => y === next[i]) ? prev : next));
  }

  return (
    <Box
      style={{
        width: width,
        height: height,
      }}
      sx={{ overflow: 'auto' }}
    >
      <Box sx={{ position: 'relative', minHeight: height, height: chartHeight }}>
        <EChart
          style={{
            minHeight: height,
            height: chartHeight,
          }}
          option={option}
          theme={chartsTheme.echartsTheme}
          _instance={chartRef}
          onEvents={{
            finished: () => {
              if (chartRef.current) {
                placeLinks(chartRef.current);
              }
            },
          }}
        />
        {labelColumn > 0 &&
          data?.map((item, index) => {
            const y = labelYs[index];
            if (!item.href || y === undefined || Number.isNaN(y)) {
              return null;
            }
            return (
              <Link
                key={`${item.label}-${index}`}
                href={item.href}
                target={linkTargetBlank ? '_blank' : undefined}
                rel={linkTargetBlank ? 'noopener noreferrer' : undefined}
                title={item.label}
                underline="hover"
                sx={{
                  position: 'absolute',
                  zIndex: 1,
                  left: 4,
                  top: y,
                  transform: 'translateY(-50%)',
                  maxWidth: labelColumn - LABEL_TEXT_INSET_PX,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: LABEL_LINK_FONT_PX,
                  lineHeight: 1.2,
                }}
              >
                {item.label}
              </Link>
            );
          })}
      </Box>
    </Box>
  );
}
