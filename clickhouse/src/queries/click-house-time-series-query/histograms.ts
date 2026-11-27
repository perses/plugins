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

import type { BucketTuple, HistogramValue } from '@perses-dev/spec';

import type { ClickHouseColumn } from '../../model/click-house-types';
import { findColumn } from '../../model/click-house-types';
import { toNumber } from '../../model/values';

// Boundary rules of the buckets, as in the Prometheus API: which of the two bounds belong to the bucket.
const UPPER_INCLUSIVE = 0;
const LOWER_INCLUSIVE = 1;
const BOTH_INCLUSIVE = 3;

/**
 * Columns of an OpenTelemetry histogram, as written by the ClickHouse exporter of the OpenTelemetry Collector:
 * `BucketCounts` and `ExplicitBounds` for an explicit bucket histogram, `PositiveBucketCounts` and its companions for
 * an exponential one. Indexes are -1 for the columns the result does not have.
 */
export interface HistogramColumns {
  count: number;
  sum: number;
  bucketCounts: number;
  explicitBounds: number;
  scale: number;
  zeroCount: number;
  positiveOffset: number;
  positiveBucketCounts: number;
  negativeOffset: number;
  negativeBucketCounts: number;
}

/** findHistogramColumns returns the histogram columns of a result, or undefined when it holds no histogram. */
export function findHistogramColumns(columns: ClickHouseColumn[]): HistogramColumns | undefined {
  const index = (name: string): number => findColumn(columns, [name]);
  const histogram: HistogramColumns = {
    count: index('count'),
    sum: index('sum'),
    bucketCounts: index('bucketcounts'),
    explicitBounds: index('explicitbounds'),
    scale: index('scale'),
    zeroCount: index('zerocount'),
    positiveOffset: index('positiveoffset'),
    positiveBucketCounts: index('positivebucketcounts'),
    negativeOffset: index('negativeoffset'),
    negativeBucketCounts: index('negativebucketcounts'),
  };
  const isExplicit = histogram.bucketCounts !== -1 && histogram.explicitBounds !== -1;
  const isExponential = histogram.positiveBucketCounts !== -1 && histogram.scale !== -1;
  return isExplicit || isExponential ? histogram : undefined;
}

/** histogramColumnIndexes lists the columns that are part of the histogram, and so are neither values nor labels. */
export function histogramColumnIndexes(histogram: HistogramColumns): Set<number> {
  return new Set(Object.values(histogram).filter((index) => index !== -1));
}

function toNumbers(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const numbers: number[] = [];
  for (const item of value) {
    const number = toNumber(item);
    if (number === null) return undefined;
    numbers.push(number);
  }
  return numbers;
}

/**
 * explicitBuckets converts the buckets of an explicit bucket histogram. Bucket `i` counts the values in
 * `(bounds[i - 1], bounds[i]]`, so the first and the last buckets are unbounded. As a chart can not draw them, they
 * are given a bound: 0 for the first one when the bounds are positive, as for a duration or a size, and otherwise the
 * width of the neighbouring bucket. Empty buckets are left out.
 */
export function explicitBuckets(bounds: number[], counts: number[]): BucketTuple[] {
  if (counts.length !== bounds.length + 1) return [];
  const buckets: BucketTuple[] = [];
  const first = bounds[0];
  const last = bounds[bounds.length - 1];
  for (let index = 0; index < counts.length; index++) {
    const count = counts[index] ?? 0;
    if (count <= 0) continue;
    let lower = bounds[index - 1];
    let upper = bounds[index];
    if (lower === undefined && upper === undefined) {
      // A histogram without bounds has a single bucket holding every value: there is no range to draw.
      continue;
    }
    if (lower === undefined && first !== undefined) {
      const width = bounds.length > 1 ? (bounds[1] ?? first) - first : Math.max(Math.abs(first), 1);
      lower = first > 0 ? 0 : first - width;
    }
    if (upper === undefined && last !== undefined) {
      const width = bounds.length > 1 ? last - (bounds[bounds.length - 2] ?? last) : Math.max(Math.abs(last), 1);
      upper = last + width;
    }
    buckets.push([UPPER_INCLUSIVE, String(lower), String(upper), String(count)]);
  }
  return buckets;
}

/**
 * exponentialBuckets converts the buckets of an exponential histogram. With `base = 2^(2^-scale)`, the positive
 * bucket at `index` counts the values in `(base^index, base^(index + 1)]`; negative buckets mirror them, and the zero
 * bucket counts the values equal to zero. Empty buckets are left out.
 */
export function exponentialBuckets(
  scale: number,
  zeroCount: number,
  positive: { offset: number; counts: number[] },
  negative: { offset: number; counts: number[] },
): BucketTuple[] {
  const factor = 2 ** -scale;
  const bound = (index: number): number => 2 ** (index * factor);
  const buckets: BucketTuple[] = [];
  for (let position = negative.counts.length - 1; position >= 0; position--) {
    const count = negative.counts[position] ?? 0;
    if (count <= 0) continue;
    const index = negative.offset + position;
    buckets.push([LOWER_INCLUSIVE, String(-bound(index + 1)), String(-bound(index)), String(count)]);
  }
  if (zeroCount > 0) {
    buckets.push([BOTH_INCLUSIVE, '0', '0', String(zeroCount)]);
  }
  for (let position = 0; position < positive.counts.length; position++) {
    const count = positive.counts[position] ?? 0;
    if (count <= 0) continue;
    const index = positive.offset + position;
    buckets.push([UPPER_INCLUSIVE, String(bound(index)), String(bound(index + 1)), String(count)]);
  }
  return buckets;
}

/** readHistogram reads the histogram of a row, or undefined when its columns do not hold a valid one. */
export function readHistogram(row: unknown[], columns: HistogramColumns): HistogramValue | undefined {
  let buckets: BucketTuple[];
  if (columns.bucketCounts !== -1 && columns.explicitBounds !== -1) {
    const bounds = toNumbers(row[columns.explicitBounds]);
    const counts = toNumbers(row[columns.bucketCounts]);
    if (!bounds || !counts) return undefined;
    buckets = explicitBuckets(bounds, counts);
  } else {
    const scale = toNumber(row[columns.scale]);
    const positive = toNumbers(row[columns.positiveBucketCounts]);
    if (scale === null || !positive) return undefined;
    buckets = exponentialBuckets(
      scale,
      toNumber(row[columns.zeroCount]) ?? 0,
      { offset: toNumber(row[columns.positiveOffset]) ?? 0, counts: positive },
      {
        offset: toNumber(row[columns.negativeOffset]) ?? 0,
        counts: toNumbers(row[columns.negativeBucketCounts]) ?? [],
      },
    );
  }
  let total = 0;
  for (const bucket of buckets) total += Number(bucket[3]);
  const sum = toNumber(row[columns.sum]);
  return {
    count: toNumber(row[columns.count]) ?? total,
    sum: sum === null ? 'NaN' : String(sum),
    buckets,
  };
}
