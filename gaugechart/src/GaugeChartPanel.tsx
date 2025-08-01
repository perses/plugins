// Copyright 2023 The Perses Authors
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

import { Box, Skeleton, Stack } from '@mui/material';
import { useChartsTheme } from '@perses-dev/components';
import { CalculationsMap, DEFAULT_CALCULATION, TimeSeriesData } from '@perses-dev/core';
import { PanelProps } from '@perses-dev/plugin-system';
import type { GaugeSeriesOption } from 'echarts';
import merge from 'lodash/merge';
import { ReactElement, useMemo } from 'react';
import {
  DEFAULT_FORMAT,
  DEFAULT_MAX_PERCENT,
  DEFAULT_MAX_PERCENT_DECIMAL,
  GaugeChartOptions,
} from './gauge-chart-model';
import { convertThresholds, defaultThresholdInput } from './thresholds';
import { GaugeChartBase, GaugeSeries } from './GaugeChartBase';

const EMPTY_GAUGE_SERIES: GaugeSeries = { label: '', value: undefined };
const GAUGE_MIN_WIDTH = 90;
const PANEL_PADDING_OFFSET = 20;

export type GaugeChartPanelProps = PanelProps<GaugeChartOptions, TimeSeriesData>;

export function GaugeChartPanel(props: GaugeChartPanelProps): ReactElement | null {
  const { spec: pluginSpec, contentDimensions, queryResults } = props;
  const { calculation, max } = pluginSpec;

  const { thresholds: thresholdsColors } = useChartsTheme();

  // ensures all default format properties set if undef
  const format = merge({}, DEFAULT_FORMAT, pluginSpec.format);

  const thresholds = pluginSpec.thresholds ?? defaultThresholdInput;

  const gaugeData: GaugeSeries[] = useMemo(() => {
    if (queryResults[0]?.data === undefined) {
      return [];
    }

    if (CalculationsMap[calculation] === undefined) {
      console.warn(`Invalid GaugeChart panel calculation ${calculation}, fallback to ${DEFAULT_CALCULATION}`);
    }

    const calculate = CalculationsMap[calculation] ?? CalculationsMap[DEFAULT_CALCULATION];

    const seriesData: GaugeSeries[] = [];
    for (const timeSeries of queryResults[0].data.series) {
      const series = {
        value: calculate(timeSeries.values),
        label: timeSeries.formattedName ?? '',
      };
      seriesData.push(series);
    }
    return seriesData;
  }, [queryResults, calculation]);

  if (contentDimensions === undefined) return null;

  // needed for end value of last threshold color segment
  let thresholdMax = max;
  if (thresholdMax === undefined) {
    if (format.unit === 'percent') {
      thresholdMax = DEFAULT_MAX_PERCENT;
    } else {
      thresholdMax = DEFAULT_MAX_PERCENT_DECIMAL;
    }
  }
  const axisLineColors = convertThresholds(thresholds, format, thresholdMax, thresholdsColors);

  const axisLine: GaugeSeriesOption['axisLine'] = {
    show: true,
    lineStyle: {
      width: 5,
      color: axisLineColors,
    },
  };

  // no data message handled inside chart component
  if (gaugeData.length === 0) {
    return (
      <GaugeChartBase
        width={contentDimensions.width}
        height={contentDimensions.height}
        data={EMPTY_GAUGE_SERIES}
        format={format}
        axisLine={axisLine}
        max={thresholdMax}
      />
    );
  }

  // accounts for showing a separate chart for each time series
  let chartWidth = contentDimensions.width / gaugeData.length - PANEL_PADDING_OFFSET;
  if (chartWidth < GAUGE_MIN_WIDTH && gaugeData.length > 1) {
    // enables horizontal scroll when charts overflow outside of panel
    chartWidth = GAUGE_MIN_WIDTH;
  }

  const hasMultipleCharts = gaugeData.length > 1;

  return (
    <Stack
      direction="row"
      spacing={hasMultipleCharts ? 2 : 0}
      justifyContent={hasMultipleCharts ? 'left' : 'center'}
      alignItems="center"
      sx={{
        // so scrollbar only shows when necessary
        overflowX: gaugeData.length > 1 ? 'scroll' : 'auto',
      }}
    >
      {gaugeData.map((series, seriesIndex) => {
        return (
          <Box key={`gauge-series-${seriesIndex}`}>
            <GaugeChartBase
              width={chartWidth}
              height={contentDimensions.height}
              data={series}
              format={format}
              axisLine={axisLine}
              max={thresholdMax}
            />
          </Box>
        );
      })}
    </Stack>
  );
}

export function GaugeChartLoading({ contentDimensions }: GaugeChartPanelProps): React.ReactElement | null {
  if (contentDimensions === undefined) return null;
  return (
    <Skeleton
      sx={{ margin: '0 auto' }}
      variant="circular"
      width={contentDimensions.width > contentDimensions.height ? contentDimensions.height : contentDimensions.width}
      height={contentDimensions.height}
    />
  );
}
