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
import type { ChartInstance, LegendProps, SelectedLegendItemState } from '@perses-dev/components';
import { ContentWithLegend, DEFAULT_LEGEND, useChartsTheme } from '@perses-dev/components';
import type { CalculationType, PanelProps } from '@perses-dev/plugin-system';
import { CalculationsMap, validateLegendSpec } from '@perses-dev/plugin-system';
import type { TimeSeriesData } from '@perses-dev/spec';
import merge from 'lodash/merge';
import type { ReactElement } from 'react';
import { useId, useMemo, useRef, useState } from 'react';

import { getConsistentColor, getSeriesColor } from './colors';
import { resolvePieChartVisualOptions } from './pie-chart-model';
import type { PieChartOptions } from './pie-chart-model';
import type { PieChartData } from './PieChartBase';
import { PieChartBase } from './PieChartBase';
import type { PieChartLegendMapper } from './utils';
import { PieChartListLegendMapper, PieChartTableLegendMapper, sortSeriesData } from './utils';

export type PieChartPanelProps = PanelProps<PieChartOptions, TimeSeriesData>;

function getAutomaticColorKeys(queryResults: PieChartPanelProps['queryResults']): string[] {
  const queryNames = queryResults.map(
    (result, queryIndex) => result.definition.spec.name ?? `Query #${queryIndex + 1}`,
  );
  const queryNameCounts = new Map<string, number>();
  const seriesQueryIndexes = new Map<string, Set<number>>();

  queryNames.forEach((queryName) => queryNameCounts.set(queryName, (queryNameCounts.get(queryName) ?? 0) + 1));
  queryResults.forEach((result, queryIndex) => {
    result.data.series?.forEach((series) => {
      let queryIndexes = seriesQueryIndexes.get(series.name);
      if (!queryIndexes) {
        queryIndexes = new Set<number>();
        seriesQueryIndexes.set(series.name, queryIndexes);
      }
      queryIndexes.add(queryIndex);
    });
  });

  return queryResults.flatMap((result, queryIndex) => {
    const queryName = queryNames[queryIndex] ?? `Query #${queryIndex + 1}`;
    const queryIdentity = queryNameCounts.get(queryName) === 1 ? queryName : JSON.stringify([queryName, queryIndex]);

    return (
      result.data.series?.map((series) => {
        // Preserve the existing color seed unless the series name collides across queries.
        return seriesQueryIndexes.get(series.name)?.size === 1
          ? series.name
          : JSON.stringify([series.name, queryIdentity]);
      }) ?? []
    );
  });
}

export function PieChartPanel(props: PieChartPanelProps): ReactElement | null {
  const {
    spec: { calculation, sort, mode, format: formatOptions, legend: pieChartLegend, showLabels },
    contentDimensions,
    queryResults,
  } = props;
  const { colorPalette, innerRadius, outerRadius } = resolvePieChartVisualOptions(props.spec);
  const chartsTheme = useChartsTheme();
  const chartId = useId();

  // Memoize the color list for palette and query-result changes.
  const colorList = useMemo(() => {
    const seriesNames = queryResults.flatMap((result) => result.data.series?.map((series) => series.name) ?? []);
    if (colorPalette === undefined) {
      const colorKeys = getAutomaticColorKeys(queryResults);
      return seriesNames.map((seriesName, index) =>
        getConsistentColor(colorKeys[index] ?? seriesName, seriesName.toLowerCase().includes('error')),
      );
    }
    return getSeriesColor(seriesNames, colorPalette);
  }, [colorPalette, queryResults]);

  const pieChartData = useMemo((): Array<Required<PieChartData>> => {
    const calculate = CalculationsMap[calculation as CalculationType];
    const pieChartData: Array<Required<PieChartData>> = [];
    let colorIndex = 0;
    queryResults.forEach((result, queryIndex) => {
      const series = result?.data.series ?? [];

      series.forEach((seriesData, seriesIndex) => {
        const seriesId = `${chartId}${seriesData.name}${seriesIndex}${queryIndex}`;
        const seriesColor = colorList[colorIndex] ?? '#ff0000';
        colorIndex += 1;

        const seriesItem = {
          id: seriesId,
          value: calculate(seriesData.values) ?? null,
          name: seriesData.formattedName ?? '',
          itemStyle: {
            color: seriesColor,
          },
        };

        pieChartData.push(seriesItem);
      });
    });

    return sortSeriesData(pieChartData, sort);
  }, [calculation, chartId, colorList, queryResults, sort]);

  const { legendItems, legendColumns } = useMemo(() => {
    const pieChartLegendMapper: PieChartLegendMapper =
      pieChartLegend?.mode === 'table' ? new PieChartTableLegendMapper() : new PieChartListLegendMapper();
    const values = pieChartLegend?.values;
    const legendItems = pieChartLegendMapper.mapToLegendItems(pieChartData, values);
    const legendColumns = pieChartLegendMapper.mapToLegendColumns(values, formatOptions);
    return {
      legendItems,
      legendColumns,
    };
  }, [formatOptions, pieChartData, pieChartLegend?.mode, pieChartLegend?.values]);

  const contentPadding = chartsTheme.container.padding.default;
  const adjustedContentDimensions: typeof contentDimensions = contentDimensions
    ? {
        width: contentDimensions.width - contentPadding * 2,
        height: contentDimensions.height - contentPadding * 2,
      }
    : undefined;

  const legend = useMemo(() => {
    return props.spec.legend && validateLegendSpec(props.spec.legend)
      ? merge({}, DEFAULT_LEGEND, props.spec.legend)
      : undefined;
  }, [props.spec.legend]);

  const [selectedLegendItems, setSelectedLegendItems] = useState<SelectedLegendItemState>('ALL');

  const [legendSorting, setLegendSorting] = useState<NonNullable<LegendProps['tableProps']>['sorting']>();

  const chartRef = useRef<ChartInstance>(null);

  // ensures there are fallbacks for unset properties since most
  // users should not need to customize visual display

  if (!contentDimensions) return null;

  return (
    <Box sx={{ padding: `${contentPadding}px` }}>
      <ContentWithLegend
        width={adjustedContentDimensions?.width ?? 400}
        height={adjustedContentDimensions?.height ?? 1000}
        // Making this small enough that the medium size doesn't get
        // responsive-handling-ed away when in the panel options editor.
        minChildrenHeight={50}
        legendSize={legend?.size}
        legendProps={
          legend && {
            options: legend,
            data: legendItems,
            selectedItems: selectedLegendItems,
            onSelectedItemsChange: setSelectedLegendItems,
            tableProps: {
              columns: legendColumns,
              sorting: legendSorting,
              onSortingChange: setLegendSorting,
            },
            onItemMouseOver: (e, { id }): void => {
              chartRef.current?.highlightSeries({ name: id });
            },
            onItemMouseOut: (): void => {
              chartRef.current?.clearHighlightedSeries();
            },
          }
        }
      >
        {({ height, width }) => {
          return (
            <Box style={{ height, width }}>
              <PieChartBase
                data={pieChartData}
                width={width}
                height={height}
                mode={mode}
                formatOptions={formatOptions}
                showLabels={Boolean(showLabels)}
                innerRadius={innerRadius}
                outerRadius={outerRadius}
              />
            </Box>
          );
        }}
      </ContentWithLegend>
    </Box>
  );
}
