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

import { Box, Stack, Typography } from '@mui/material';
import { TimeSeriesData } from '@perses-dev/core';
import { PanelProps } from '@perses-dev/plugin-system';
import merge from 'lodash/merge';
import { ReactElement, useMemo } from 'react';
import { useChartsTheme } from '@perses-dev/components';
import { DEFAULT_FORMAT, DEFAULT_THRESHOLDS, HistogramChartOptions } from '../histogram-chart-model';
import { HistogramChart, HistogramChartData } from './HistogramChart';

const HISTOGRAM_MIN_WIDTH = 90;

export type HistogramChartPanelProps = PanelProps<HistogramChartOptions, TimeSeriesData>;

export function HistogramChartPanel(props: HistogramChartPanelProps): ReactElement | null {
  const { spec: pluginSpec, contentDimensions, queryResults } = props;
  const { min, max } = pluginSpec;

  const chartsTheme = useChartsTheme();
  // ensures all default format properties set if undef
  const format = merge({}, DEFAULT_FORMAT, pluginSpec.format);
  const thresholds = merge({}, DEFAULT_THRESHOLDS, pluginSpec.thresholds);

  const histogramData: HistogramChartData[] = useMemo(() => {
    const histograms: HistogramChartData[] = [];

    for (const result of queryResults) {
      for (const timeSeries of result.data.series) {
        if (!timeSeries.histograms || timeSeries.histograms.length === 0) {
          continue;
        }

        const [, histoBuckets] = timeSeries.histograms[0]!;
        if (histoBuckets && histoBuckets.buckets) {
          histograms.push({ buckets: histoBuckets.buckets });
        }
      }
    }
    return histograms;
  }, [queryResults]);

  // no data message handled inside chart component
  if (histogramData.length === 0) {
    return (
      <Stack justifyContent="center" height="100%">
        <Typography variant="body2" textAlign="center">
          No data available (only native histograms are supported for now)
        </Typography>
      </Stack>
    );
  }

  if (contentDimensions === undefined) return null;

  // accounts for showing a separate chart for each time series
  let chartWidth = contentDimensions.width / histogramData.length - chartsTheme.container.padding.default;
  if (chartWidth < HISTOGRAM_MIN_WIDTH && histogramData.length > 1) {
    // enables horizontal scroll when charts overflow outside of panel
    chartWidth = HISTOGRAM_MIN_WIDTH;
  }

  return (
    <Stack
      direction="row"
      justifyContent="center"
      alignItems="center"
      sx={{
        // so scrollbar only shows when necessary
        overflowX: histogramData.length > 1 ? 'scroll' : 'auto',
      }}
    >
      {histogramData.map((series, seriesIndex) => {
        return (
          <Box key={`histogram-series-${seriesIndex}`}>
            <HistogramChart
              width={chartWidth}
              height={contentDimensions.height}
              data={series}
              format={format}
              min={min}
              max={max}
              thresholds={thresholds}
            />
          </Box>
        );
      })}
    </Stack>
  );
}
