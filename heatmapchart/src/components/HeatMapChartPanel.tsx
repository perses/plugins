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

const HEATMAP_MIN_HEIGHT = 200;
const HEATMAP_ITEM_MIN_HEIGHT = 2;

/**
 * Helper function to apply logarithmic transformation to a value.
 * Returns the log of the value in the specified base.
 *
 * NOTE: This custom log transformation is required because ECharts heatmap
 * charts require category-type axes (type: 'category'), which do not support
 * native logarithmic scaling. Only value-type axes support type: 'log'.
 * Unlike HistogramChart or TimeSeriesChart which can use ECharts' native
 * log axis, we must manually transform the data and Y-axis categories.
 */
const logTransform = (value: number, logBase: number): number => {
  if (value <= 0) return -Infinity;
  return Math.log(value) / Math.log(logBase);
};

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
    yAxisCategories,
    countMin,
    countMax,
    timeScale,
  }: {
    data: HeatMapDataItem[];
    xAxisCategories: number[];
    yAxisCategories: string[];
    countMin: number;
    countMax: number;
    timeScale?: TimeScale;
  } = useMemo(() => {
    if (!queryResults || queryResults.length === 0) {
      return {
        data: [],
        xAxisCategories: [],
        yAxisCategories: [],
        countMin: 0,
        countMax: 0,
        timeScale: undefined,
      };
    }

    if (
      queryResults.length != 1 ||
      queryResults[0]!.data.series.length != 1 ||
      queryResults[0]!.data.series[0]!.histograms === undefined
    ) {
      return {
        data: [],
        xAxisCategories: [],
        yAxisCategories: [],
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const [_, histogram] of series?.histograms ?? []) {
      for (const bucket of histogram?.buckets ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_, lowerBound, upperBound, count] = bucket;
        let lowerBoundFloat = parseFloat(lowerBound);
        const upperBoundFloat = parseFloat(upperBound);
        const countFloat = parseFloat(count);

        // For logarithmic scales, skip buckets that would be entirely non-positive
        // Log scales cannot represent non-positive values, so we exclude any buckets where the upper bound is <= 0
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

    const height = contentDimensions?.height ?? HEATMAP_MIN_HEIGHT;

    // Calculate range and item size based on scale type
    let totalRange: number;
    let rangePerItem: number;
    let totalItems: number;

    if (logBase !== undefined) {
      // For logarithmic scale, work in log space
      const logLowest = logTransform(lowestBound, logBase);
      const logHighest = logTransform(highestBound, logBase);
      totalRange = logHighest - logLowest;
      totalItems = Math.ceil(height / HEATMAP_ITEM_MIN_HEIGHT);
      rangePerItem = totalRange / totalItems;
    } else {
      // Linear scale (original behavior)
      totalRange = highestBound - lowestBound;
      rangePerItem = (totalRange * HEATMAP_ITEM_MIN_HEIGHT) / height;
      totalItems = Math.ceil(height / HEATMAP_ITEM_MIN_HEIGHT);
    }

    // Generating value of the Y axis based on the height divided by the size of a cell (item)
    // For log scale, we generate categories from log-transformed space but display original values
    const yAxisCategories: string[] = Array.from({ length: totalItems }, (_, index) => {
      if (logBase !== undefined) {
        // Convert from log space back to linear space for display
        const logLowest = logTransform(lowestBound, logBase);
        const logValue = logLowest + index * rangePerItem;
        const linearValue = Math.pow(logBase, logValue);
        return linearValue.toFixed(3);
      } else {
        return (lowestBound + index * rangePerItem).toFixed(3);
      }
    });

    const data: HeatMapDataItem[] = [];
    // Logic for filling all cells where a bucket is present
    for (const [time, histogram] of series?.histograms ?? []) {
      const itemIndexOnXaxis = xAxisCategories.findIndex((v) => v === time * 1000);

      for (const bucket of histogram?.buckets ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_, lowerBound, upperBound, count] = bucket;
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

        let yLowerBoundItem: number;
        let yUpperBoundItem: number;

        if (logBase !== undefined) {
          // Calculate Y positions in log space
          const logLowest = logTransform(lowestBound, logBase);
          const logLower = logTransform(lowerBoundFloat, logBase);
          const logUpper = logTransform(upperBoundFloat, logBase);
          yLowerBoundItem = Math.floor((logLower - logLowest) / rangePerItem);
          yUpperBoundItem = Math.ceil((logUpper - logLowest) / rangePerItem);
        } else {
          yLowerBoundItem = Math.floor((lowerBoundFloat - lowestBound) / rangePerItem);
          yUpperBoundItem = Math.ceil((upperBoundFloat - lowestBound) / rangePerItem);
        }

        for (let i = 0; i < yUpperBoundItem - yLowerBoundItem; i++) {
          // TODO: some bucket may have overlapping cells, we could use avg value. Probably will need to move to a matrix data structure for performance reasons
          data.push({
            value: [itemIndexOnXaxis, yLowerBoundItem + i, parseFloat(count)],
            label: count,
          });
        }
      }
    }
    return {
      data,
      xAxisCategories,
      yAxisCategories,
      countMin,
      countMax,
      timeScale,
    };
  }, [contentDimensions?.height, pluginSpec.logBase, queryResults]);

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
        yAxisCategories={yAxisCategories}
        yAxisFormat={yAxisFormat}
        countFormat={countFormat}
        countMin={countMin}
        countMax={countMax}
        timeScale={timeScale}
        showVisualMap={pluginSpec.showVisualMap}
      />
    </Stack>
  );
}
