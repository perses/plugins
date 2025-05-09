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

import { Box, useTheme } from '@mui/material';
import {
  ChartInstance,
  ContentWithLegend,
  LegendItem,
  LegendProps,
  PieChart,
  PieChartData,
  SelectedLegendItemState,
  useChartsTheme,
  useId,
} from '@perses-dev/components';
import { CalculationType, CalculationsMap, DEFAULT_LEGEND, TimeSeriesData } from '@perses-dev/core';
import { PanelProps, validateLegendSpec } from '@perses-dev/plugin-system';
import merge from 'lodash/merge';
import { ReactElement, useMemo, useRef, useState } from 'react';
import { getSeriesColor } from './palette-gen';
import { PieChartOptions } from './pie-chart-model';
import { calculatePercentages, sortSeriesData } from './utils';

export type PieChartPanelProps = PanelProps<PieChartOptions, TimeSeriesData>;

export function PieChartPanel(props: PieChartPanelProps): ReactElement | null {
  const {
    spec: { calculation, sort, mode },
    contentDimensions,
    queryResults,
  } = props;
  const chartsTheme = useChartsTheme();
  const muiTheme = useTheme();
  const PADDING = chartsTheme.container.padding.default;
  const chartId = useId('time-series-panel');
  const categoricalPalette = chartsTheme.echartsTheme.color;

  const { pieChartData, legendItems } = useMemo(() => {
    const calculate = CalculationsMap[calculation as CalculationType];
    const pieChartData: PieChartData[] = [];
    const legendItems: LegendItem[] = [];

    for (let queryIndex = 0; queryIndex < queryResults.length; queryIndex++) {
      const result = queryResults[queryIndex];

      let seriesIndex = 0;
      for (const seriesData of result?.data.series ?? []) {
        const seriesColor = getSeriesColor({
          categoricalPalette: categoricalPalette as string[],
          muiPrimaryColor: muiTheme.palette.primary.main,
          seriesName: seriesData.name,
        });
        const series = {
          value: calculate(seriesData.values) ?? null,
          name: seriesData.formattedName ?? '',
          itemStyle: {
            color: seriesColor,
          },
        };
        pieChartData.push(series);

        const seriesId = chartId + seriesData.name + seriesIndex;
        legendItems.push({
          id: seriesId,
          label: series.name,
          color: seriesColor,
        });
        seriesIndex++;
      }
    }

    const sortedPieChartData = sortSeriesData(pieChartData, sort);
    if (mode === 'percentage') {
      return {
        pieChartData: calculatePercentages(sortedPieChartData),
        legendItems,
      };
    }
    return {
      pieChartData: sortedPieChartData,
      legendItems,
    };
  }, [calculation, sort, mode, queryResults, categoricalPalette, muiTheme.palette.primary.main, chartId]);

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

  if (contentDimensions === undefined) return null;

  return (
    <Box sx={{ padding: `${PADDING}px` }}>
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
              columns: [],
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
              <PieChart
                data={pieChartData}
                width={contentDimensions.width - PADDING * 2}
                height={contentDimensions.height - PADDING * 2}
              />
            </Box>
          );
        }}
      </ContentWithLegend>
    </Box>
  );
}
