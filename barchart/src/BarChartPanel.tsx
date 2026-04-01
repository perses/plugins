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

import { useChartsTheme } from '@perses-dev/components';
import { Box } from '@mui/material';
import { ReactElement, useMemo } from 'react';
import { CalculationType, CalculationsMap, TimeSeriesData } from '@perses-dev/core';
import { PanelProps } from '@perses-dev/plugin-system';
import { BarChartOptions } from './bar-chart-model';
import { calculatePercentages, sortSeriesData } from './utils';
import { BarChartBase, BarChartData, StackedBarChartData, StackedBarChartSeries } from './BarChartBase';

export type BarChartPanelProps = PanelProps<BarChartOptions, TimeSeriesData>;

export function BarChartPanel(props: BarChartPanelProps): ReactElement | null {
  const {
    spec: { calculation, format, sort, mode, groupBy = [], isStacked = false, orientation = 'horizontal' },
    contentDimensions,
    queryResults,
  } = props;

  const chartsTheme = useChartsTheme();
  const PADDING = chartsTheme.container.padding.default;

  const barChartData: BarChartData[] = useMemo(() => {
    if (groupBy.length > 0) return [];

    const calculate = CalculationsMap[calculation as CalculationType];
    const barChartData: BarChartData[] = [];
    for (const result of queryResults) {
      for (const seriesData of result.data.series) {
        const series = {
          value: calculate(seriesData.values) ?? null,
          label: seriesData.formattedName ?? '',
        };
        barChartData.push(series);
      }
    }

    const sortedBarChartData = sortSeriesData(barChartData, sort);
    if (mode === 'percentage') {
      return calculatePercentages(sortedBarChartData);
    } else {
      return sortedBarChartData;
    }
  }, [queryResults, sort, mode, calculation, groupBy]);

  const stackedBarChartData: StackedBarChartData | null = useMemo(() => {
    if (groupBy.length === 0) return null;

    const calculate = CalculationsMap[calculation as CalculationType];
    const groupMap = new Map<string, Map<string, number>>();
    const segmentNamesOrdered: string[] = [];
    const segmentNamesSet = new Set<string>();

    for (const queryResult of queryResults) {
      for (const seriesData of queryResult.data.series) {
        const labels = seriesData.labels ?? {};

        const groupKey = groupBy.map((k) => labels[k] ?? '').join(' / ');

        const remainingEntries = Object.entries(labels).filter(([k]) => !groupBy.includes(k));
        const segmentName =
          remainingEntries.length > 0
            ? '{' + remainingEntries.map(([k, v]) => `${k}="${v}"`).join(', ') + '}'
            : (seriesData.formattedName ?? seriesData.name);

        if (!groupMap.has(groupKey)) {
          groupMap.set(groupKey, new Map());
        }
        const segMap = groupMap.get(groupKey);
        if (!segMap) continue;
        const value = calculate(seriesData.values) ?? 0;
        segMap.set(segmentName, (segMap.get(segmentName) ?? 0) + value);

        if (!segmentNamesSet.has(segmentName)) {
          segmentNamesSet.add(segmentName);
          segmentNamesOrdered.push(segmentName);
        }
      }
    }

    if (groupMap.size === 0) return null;
    const getTotalValue = (cat: string): number =>
      Array.from(groupMap.get(cat)?.values() ?? []).reduce((a, b) => a + b, 0);

    let categories = Array.from(groupMap.keys());
    if (sort === 'asc') {
      categories = categories.sort((a, b) => getTotalValue(a) - getTotalValue(b));
    } else if (sort === 'desc') {
      categories = categories.sort((a, b) => getTotalValue(b) - getTotalValue(a));
    }

    const series: StackedBarChartSeries[] = segmentNamesOrdered.map((segName) => {
      const values = categories.map((cat) => {
        const rawVal = groupMap.get(cat)?.get(segName) ?? null;
        if (mode === 'percentage' && rawVal !== null) {
          const total = getTotalValue(cat);
          return total > 0 ? (rawVal / total) * 100 : 0;
        }
        return rawVal;
      });
      return { name: segName, values };
    });

    return { categories, series };
  }, [queryResults, groupBy, sort, mode, calculation]);

  if (contentDimensions === undefined) return null;

  const effectiveFormat =
    mode === 'percentage' ? { unit: 'percent' as const, decimalPlaces: format?.decimalPlaces } : format;

  return (
    <Box sx={{ padding: `${PADDING}px` }}>
      <BarChartBase
        width={contentDimensions.width - PADDING * 2}
        height={contentDimensions.height - PADDING * 2}
        data={barChartData}
        format={groupBy.length > 0 ? effectiveFormat : format}
        mode={mode}
        groupedData={stackedBarChartData}
        isStacked={isStacked}
        orientation={orientation}
      />
    </Box>
  );
}
