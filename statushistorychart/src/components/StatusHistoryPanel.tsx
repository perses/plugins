// Copyright 2024 The Perses Authors
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
import { ContentWithLegend, useChartsTheme } from '@perses-dev/components';
import { PanelProps, validateLegendSpec } from '@perses-dev/plugin-system';
import { merge } from 'lodash';
import { ReactElement, useMemo } from 'react';
import { TimeSeriesData } from '@perses-dev/core';
import { StatusHistoryChartOptions } from '../status-history-model.js';
import { useStatusHistoryDataModel } from '../utils';
import { StatusHistoryChart } from './StatusHistoryChart';

export type StatusHistoryChartPanelProps = PanelProps<StatusHistoryChartOptions, TimeSeriesData>;

export function StatusHistoryPanel(props: StatusHistoryChartPanelProps): ReactElement | null {
  const { spec, contentDimensions, queryResults } = props;

  const legend = useMemo(() => {
    return spec.legend && validateLegendSpec(spec.legend) ? merge({}, spec.legend) : undefined;
  }, [spec.legend]);

  const chartsTheme = useChartsTheme();
  const PADDING = chartsTheme.container.padding.default;

  const { statusHistoryData, yAxisCategories, xAxisCategories, legendItems, timeScale, colors } =
    useStatusHistoryDataModel(queryResults, chartsTheme.echartsTheme.color as string[], spec);

  const adjustedContentDimensions: typeof contentDimensions = contentDimensions
    ? {
        width: contentDimensions.width - PADDING * 2,
        height: contentDimensions.height - PADDING * 2,
      }
    : undefined;

  if (!statusHistoryData || statusHistoryData.length === 0) {
    return null;
  }

  return (
    <Box sx={{ padding: `${PADDING}px` }}>
      <ContentWithLegend
        width={adjustedContentDimensions?.width ?? 400}
        height={adjustedContentDimensions?.height ?? 1000}
        legendSize={legend?.size}
        legendProps={
          legend && {
            options: legend,
            data: legendItems || [],
            selectedItems: 'ALL',
            onSelectedItemsChange: () => null,
          }
        }
      >
        {({ height, width }) => {
          return (
            <Box sx={{ height, width }}>
              <StatusHistoryChart
                xAxisCategories={xAxisCategories}
                yAxisCategories={yAxisCategories}
                data={statusHistoryData}
                timeScale={timeScale}
                height={height}
                colors={colors}
              />
            </Box>
          );
        }}
      </ContentWithLegend>
    </Box>
  );
}
