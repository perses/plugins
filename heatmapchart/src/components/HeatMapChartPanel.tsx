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

import { Stack, Typography } from '@mui/material';
import { TimeScale, TimeSeries, TimeSeriesData } from '@perses-dev/core';
import { PanelProps } from '@perses-dev/plugin-system';
import merge from 'lodash/merge';
import { ReactElement, useMemo } from 'react';
import { DEFAULT_FORMAT, HeatMapChartOptions } from '../heat-map-chart-model';
import { generateCompleteTimestamps, getCommonTimeScaleForQueries } from '../utils';
import { HeatMapChart, HeatMapDataItem } from './HeatMapChart';

const HEATMAP_MIN_HEIGHT = 200;
const HEATMAP_ITEM_MIN_HEIGHT = 2;

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
        const lowerBoundFloat = parseFloat(lowerBound);
        const upperBoundFloat = parseFloat(upperBound);
        const countFloat = parseFloat(count);
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
    const totalRange = highestBound - lowestBound;
    const rangePerItem = (totalRange * HEATMAP_ITEM_MIN_HEIGHT) / height;
    const totalItems = Math.ceil(height / HEATMAP_ITEM_MIN_HEIGHT);

    // Generating value of the Y axis based on the height divided by the size of a cell (item)
    const yAxisCategories: string[] = Array.from({ length: totalItems }, (_, index) =>
      (lowestBound + index * rangePerItem).toFixed(3)
    );

    const data: HeatMapDataItem[] = [];
    // Logic for filling all cells where a bucket is present
    for (const [time, histogram] of series?.histograms ?? []) {
      const itemIndexOnXaxis = xAxisCategories.findIndex((v) => v === time * 1000);

      for (const bucket of histogram?.buckets ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_, lowerBound, upperBound, count] = bucket;
        const yLowerBoundItem = Math.floor((parseFloat(lowerBound) - lowestBound) / rangePerItem);
        const yUpperBoundItem = Math.ceil((parseFloat(upperBound) - lowestBound) / rangePerItem);

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
  }, [contentDimensions?.height, queryResults]);

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
