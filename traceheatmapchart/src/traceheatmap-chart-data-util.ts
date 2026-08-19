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

import { TraceSearchResult } from '@perses-dev/spec';
import { ExponentialBase, getDurationBuckets, TraceHeatMapDurationBuckets } from './traceheatmap-duration-bucket-util';
import { getTimeBuckets, TraceHeatMapTimeBucket } from './traceheatmap-time-bucket-util';

export type HeatmapChartData = {
  bucketCountMap: number[][];
  bucketToFlatResultsMap: number[][][];
  timeBuckets: TraceHeatMapTimeBucket;
  durationBuckets: TraceHeatMapDurationBuckets;
  minBucketCount: number;
  maxBucketCount: number;
};

export type PlotterOptions = {
  showZero: boolean;
  zeroSubstitute: string;
};

export type FlatQueryResults = TraceSearchResult[];

export const getHeatmapChartData = (flatQueryResults: FlatQueryResults, base: ExponentialBase): HeatmapChartData => {
  /* e-chart heatmap uses the min and max for setting the color range from the most pale to darkest*/
  let minBucketCount = Infinity;
  let maxBucketCount = -Infinity;

  /**
   * Both buckets are generated according to the query results (traces)
   * to avoid fixed length and sparse buckets
   */
  const timeBuckets = getTimeBuckets(
    flatQueryResults.map((r) => ({ durationMs: r.durationMs, startTimeUnixMs: r.startTimeUnixMs }))
  );
  const durationBuckets = getDurationBuckets(
    flatQueryResults.map((qst) => qst.durationMs),
    base
  );

  /**
   * initiate the bucket-count and flat-data-index maps
   * the latter one is used to retrieve the details of query results from the received results
   */
  const bucketCountMap: number[][] = [];
  const bucketToFlatResultsMap: number[][][] = [];

  timeBuckets.forEach(() => {
    const valueRow: number[] = [];
    const metaDataMap: number[][] = [];
    durationBuckets.forEach(() => {
      valueRow.push(0);
      metaDataMap.push([]);
    });
    bucketCountMap.push(valueRow);
    bucketToFlatResultsMap.push(metaDataMap);
  });

  /* find the row and column indexes to find the fit bucket for all records */
  for (let i = 0; i < flatQueryResults.length; i += 1) {
    const { startTimeUnixMs, durationMs } = flatQueryResults[i]!;
    let timeBucketIndex = 0;
    let durationBucketIndex = 0;

    for (let j = 0; j < timeBuckets.length; j += 1) {
      if (j === timeBuckets.length - 1) {
        timeBucketIndex = j;
        break;
      }
      if (startTimeUnixMs >= timeBuckets[j]!.startTimestamp && startTimeUnixMs < timeBuckets[j + 1]!.startTimestamp) {
        timeBucketIndex = j;
        break;
      }
    }

    for (let j = 0; j < durationBuckets.length; j += 1) {
      if (j === durationBuckets.length - 1) {
        durationBucketIndex = j;
        break;
      }
      if (durationMs >= durationBuckets[j]!.start && durationMs < durationBuckets[j + 1]!.start) {
        durationBucketIndex = j;
        break;
      }
    }

    const bucketCount = bucketCountMap[timeBucketIndex]![durationBucketIndex]! + 1;
    bucketCountMap[timeBucketIndex]![durationBucketIndex]! = bucketCount;

    if (bucketCount > maxBucketCount) {
      maxBucketCount = bucketCount;
    }

    if (bucketCount < minBucketCount) {
      minBucketCount = bucketCount;
    }

    bucketToFlatResultsMap[timeBucketIndex]![durationBucketIndex]!.push(i);
  }

  return {
    bucketCountMap,
    bucketToFlatResultsMap,
    timeBuckets,
    durationBuckets,
    minBucketCount,
    maxBucketCount,
  };
};

/**
 * prepares the appropriate e-chart heatmap data format
 */
export const getPlotterData = (
  cellWeightMap: number[][],
  plotterOptions?: PlotterOptions
): Array<Array<number | string>> => {
  const { showZero, zeroSubstitute } = plotterOptions || { showZero: false, zeroSubstitute: ' ' };
  const eChartData: Array<Array<number | string>> = [];
  cellWeightMap.forEach((r, rIdx) => {
    r.forEach((c, cIdx) => {
      let value: string | number = c;
      if (!showZero && !value) {
        value = zeroSubstitute;
      }
      eChartData.push([rIdx, cIdx, value]);
    });
  });
  return eChartData;
};
