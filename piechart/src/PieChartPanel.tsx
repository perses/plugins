//Copyright 2024 The Perses Authors
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
import {
  ChartInstance,
  ContentWithLegend,
  LegendProps,
  SelectedLegendItemState,
  useChartsTheme,
  useId,
} from '@perses-dev/components';
import { CalculationsMap, CalculationType, DEFAULT_LEGEND, TimeSeriesData } from '@perses-dev/core';
import { ComparisonValues, PanelProps, validateLegendSpec } from '@perses-dev/plugin-system';
import merge from 'lodash/merge';
import { ReactElement, useMemo, useRef, useState } from 'react';
import { PieChartOptions } from './pie-chart-model';
import { PieChartLegendMapper, PieChartListLegendMapper, PieChartTableLegendMapper, sortSeriesData } from './utils';
import { getSeriesColor } from './colors';
import { PieChartBase, PieChartData } from './PieChartBase';

export type PieChartPanelProps = PanelProps<PieChartOptions, TimeSeriesData>;

export function PieChartPanel(props: PieChartPanelProps): ReactElement | null {
  const {
    spec: { calculation, sort, mode, format: formatOptions, legend: pieChartLegend, colorPalette: colorPalette },
    contentDimensions,
    queryResults,
  } = props;
  const chartsTheme = useChartsTheme();
  const chartId = useId('time-series-panel');
  const seriesNames = queryResults.flatMap((result) => result?.data.series?.map((series) => series.name) || []);

  // Memoize the color list so it only regenerates when color/palette/series count changes
  const colorList = useMemo(() => {
    return getSeriesColor(seriesNames, colorPalette);
  }, [colorPalette, seriesNames]);

  const pieChartData = useMemo((): Array<Required<PieChartData>> => {
    const calculate = CalculationsMap[calculation as CalculationType];
    const pieChartData: Array<Required<PieChartData>> = [];
    queryResults.forEach((result, queryIndex) => {
      const series = result?.data.series ?? [];

      series.forEach((seriesData, seriesIndex) => {
        const seriesId = `${chartId}${seriesData.name}${seriesIndex}${queryIndex}`;
        const seriesColor = colorList[queryIndex * series.length + seriesIndex] ?? '#ff0000';

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
    const values = pieChartLegend?.values as ComparisonValues[] | undefined;
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
                showLabels={Boolean(props.spec.showLabels)}
              />
            </Box>
          );
        }}
      </ContentWithLegend>
    </Box>
  );
}
