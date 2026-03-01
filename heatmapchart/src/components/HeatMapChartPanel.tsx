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

import { Stack, Typography } from '@mui/material';
import { TimeScale, TimeSeries, TimeSeriesData } from '@perses-dev/core';
import { PanelProps } from '@perses-dev/plugin-system';
import merge from 'lodash/merge';
import { ReactElement, useMemo } from 'react';
import { DEFAULT_FORMAT, HeatMapChartOptions, LOG_BASE } from '../heat-map-chart-model';
import { generateCompleteTimestamps, getCommonTimeScaleForQueries } from '../utils';
import { HeatMapChart, HeatMapDataItem } from './HeatMapChart';

/**
 * Helper function to get the effective lower bound for log scale.
 * For values <= 0, we use a small fraction of the upper bound.
 */
const getEffectiveLowerBound = (lowerBound: number, upperBound: number, logBase: LOG_BASE): number => {
  if (logBase === undefined || lowerBound > 0) {
    return lowerBound;
  }
  // For log scales with non-positive lower bounds, use a small fraction of upper bound
  // This ensures the bucket is still visible on the log scale
  return upperBound * 0.001;
};

export type HeatMapChartPanelProps = PanelProps<HeatMapChartOptions, TimeSeriesData>;

export function HeatMapChartPanel(props: HeatMapChartPanelProps): ReactElement | null {
  const { spec: pluginSpec, contentDimensions, queryResults } = props;

  // ensures all default format properties set if undef
  const yAxisFormat = merge({}, DEFAULT_FORMAT, pluginSpec.yAxisFormat);
  const countFormat = merge({}, DEFAULT_FORMAT, pluginSpec.countFormat);

  const {
    data,
    xAxisCategories,
    min,
    max,
    countMin,
    countMax,
    timeScale,
  }: {
    data: HeatMapDataItem[];
    xAxisCategories: number[];
    min?: number;
    max?: number;
    countMin: number;
    countMax: number;
    timeScale?: TimeScale;
  } = useMemo(() => {
    if (!queryResults || queryResults.length === 0) {
      return {
        data: [],
        xAxisCategories: [],
        min: 0,
        max: 0,
        countMin: 0,
        countMax: 0,
        timeScale: undefined,
      };
    }

    if (
      queryResults.length !== 1 ||
      queryResults[0]!.data.series.length !== 1 ||
      queryResults[0]!.data.series[0]!.histograms === undefined
    ) {
      return {
        data: [],
        xAxisCategories: [],
        min: 0,
        max: 0,
        countMin: 0,
        countMax: 0,
        timeScale: undefined,
      };
    }

    const series: TimeSeries = queryResults[0]!.data.series[0]!;

    const timeScale = getCommonTimeScaleForQueries(queryResults);
    const xAxisCategories: number[] = generateCompleteTimestamps(timeScale);

    const logBase = pluginSpec.logBase;

    // Dummy value that will be replaced at the first iteration
    let lowestBound = Infinity;
    let highestBound = -Infinity;
    let countMin = Infinity;
    let countMax = -Infinity;

    for (const [, histogram] of series?.histograms ?? []) {
      for (const bucket of histogram?.buckets ?? []) {
        const [, lowerBound, upperBound, count] = bucket;
        let lowerBoundFloat = parseFloat(lowerBound);
        const upperBoundFloat = parseFloat(upperBound);
        const countFloat = parseFloat(count);

        // For logarithmic scales, skip buckets that would be entirely non-positive
        if (logBase !== undefined && upperBoundFloat <= 0) {
          continue;
        }

        // For log scales, adjust non-positive lower bounds
        if (logBase !== undefined) {
          lowerBoundFloat = getEffectiveLowerBound(lowerBoundFloat, upperBoundFloat, logBase);
        }

        if (lowerBoundFloat < lowestBound) {
          lowestBound = lowerBoundFloat;
        }
        if (upperBoundFloat > highestBound) {
          highestBound = upperBoundFloat;
        }
        if (countFloat < countMin) {
          countMin = countFloat;
        }
        if (countFloat > countMax) {
          countMax = countFloat;
        }
      }
    }

    const data: HeatMapDataItem[] = [];
    // Each bucket becomes a rectangle spanning [lowerBound, upperBound] at the given x index
    for (const [time, histogram] of series?.histograms ?? []) {
      const itemIndexOnXaxis = xAxisCategories.findIndex((v) => v === time * 1000);

      for (const bucket of histogram?.buckets ?? []) {
        const [, lowerBound, upperBound, count] = bucket;
        let lowerBoundFloat = parseFloat(lowerBound);
        const upperBoundFloat = parseFloat(upperBound);

        // For logarithmic scales, skip buckets that would be entirely non-positive
        if (logBase !== undefined && upperBoundFloat <= 0) {
          continue;
        }

        // For log scales, adjust non-positive lower bounds
        if (logBase !== undefined) {
          lowerBoundFloat = getEffectiveLowerBound(lowerBoundFloat, upperBoundFloat, logBase);
        }

        data.push({
          value: [itemIndexOnXaxis, lowerBoundFloat, upperBoundFloat, parseFloat(count)],
          label: count,
        });
      }
    }
    return {
      data,
      xAxisCategories,
      min: lowestBound === Infinity ? undefined : lowestBound,
      max: highestBound === -Infinity ? undefined : highestBound,
      countMin,
      countMax,
      timeScale,
    };
  }, [pluginSpec.logBase, queryResults]);

  // Use configured min/max if provided, otherwise use calculated values
  // For logarithmic scales, ignore user-provided min if it's <= 0 (log of non-positive is undefined)
  // and let ECharts auto-calculate the range to avoid rendering issues
  const finalMin = useMemo(() => {
    if (pluginSpec.logBase !== undefined) {
      // For log scale, ignore min if it's <= 0 or let ECharts auto-calculate
      if (pluginSpec.min !== undefined && pluginSpec.min <= 0) {
        return undefined; // Let ECharts auto-calculate
      }
      return pluginSpec.min ?? min;
    }
    return pluginSpec.min ?? min;
  }, [pluginSpec.logBase, pluginSpec.min, min]);

  const finalMax = useMemo(() => {
    if (pluginSpec.logBase !== undefined) {
      // For log scale, ignore max if it's <= 0
      if (pluginSpec.max !== undefined && pluginSpec.max <= 0) {
        return undefined; // Let ECharts auto-calculate
      }
      return pluginSpec.max ?? max;
    }
    return pluginSpec.max ?? max;
  }, [pluginSpec.logBase, pluginSpec.max, max]);

  // TODO: add support for multiple queries
  if (queryResults.length > 1) {
    return (
      <Stack justifyContent="center" height="100%">
        <Typography variant="body2" textAlign="center">
          Only one query at a time is supported for now
        </Typography>
      </Stack>
    );
  }

  // Mo data message handled inside chart component
  if (data.length === 0) {
    return (
      <Stack justifyContent="center" height="100%">
        <Typography variant="body2" textAlign="center">
          No data available (only native histograms are supported for now)
        </Typography>
      </Stack>
    );
  }

  if (contentDimensions === undefined) return null;

  return (
    <Stack direction="row" justifyContent="center" alignItems="center">
      <HeatMapChart
        width={contentDimensions.width}
        height={contentDimensions.height}
        data={data}
        xAxisCategories={xAxisCategories}
        yAxisFormat={yAxisFormat}
        countFormat={countFormat}
        countMin={countMin}
        countMax={countMax}
        timeScale={timeScale}
        showVisualMap={pluginSpec.showVisualMap}
        min={finalMin}
        max={finalMax}
        logBase={pluginSpec.logBase}
      />
    </Stack>
  );
}
