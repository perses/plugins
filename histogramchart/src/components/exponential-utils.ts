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

import { BucketTuple } from '@perses-dev/core';
import { HistogramChartData } from './HistogramChart';

/* TODO: We should also cover 0-1 Exponential Base for Trigonometry ranges. Comes with next relevant PR (in Progress) */
export type ExponentialBase = 2 | 4 | 8 | 10;

const Exceptions = {
  EMPTY_BUCKETS: 'Buckets can not be empty or undefined',
  INVALID_BUCKET_INDEX: 'Bucket index is not valid',
  INVALID_EXPONENTIAL_BASE: 'Exponential base is not valid. The base should range from valid options: [0.5,2,4]',
  IMPROPER_EXPONENTIAL_BUCKETS: 'Decimal point base should only be used for buckets ranging from 0-1',
};

export interface Bucket {
  lb: number;
  ub: number;
  count: number;
}

export interface Exponential {
  base?: ExponentialBase;
  /* TODO: exponential itself can be also scaled  */
  /* scale: number; */
}

/**
 * Generates exponential buckets with the offset of linear buckets
 */
export const generateExponentialBucketsWithOffset = (data: HistogramChartData, base: ExponentialBase = 2): Bucket[] => {
  /* TODO: We should also cover 0-1 Exponential Base for Trigonometry ranges. Comes with next relevant PR (in Progress) */
  if (!data.buckets?.length) throw Error(Exceptions.EMPTY_BUCKETS);

  const exponentialBuckets: Bucket[] = [];

  const minLowerBound = Math.floor(Math.min(...data.buckets.map((b) => parseFloat(b[1]))));
  const maxUpperBound = Math.ceil(Math.max(...data.buckets.map((b) => parseFloat(b[2]))));

  if (!minLowerBound) {
    exponentialBuckets.push({ lb: 0, ub: 1, count: 0 });
  } else {
    exponentialBuckets.push({ lb: minLowerBound, ub: minLowerBound + 1, count: 0 });
  }

  let n = 0;
  let continueGenerating = true;

  while (continueGenerating) {
    const lb = minLowerBound + Math.pow(base, n);
    n += 1;
    const ub = minLowerBound + Math.pow(base, n);

    if (lb < maxUpperBound) {
      exponentialBuckets.push({ lb, ub, count: 0 });
    } else {
      continueGenerating = false;
    }
  }

  return exponentialBuckets;
};

/**
 * Redistributes linear buckets into the exponential buckets. Mutates the exponential buckets in place
 * @param data Linear buckets data
 * @param exponentialBuckets Generated exponential buckets
 * @param engagedExponentialBucketsIndexes Indexes of the exponential buckets over which the linear buckets are distributed.
 * @param count The count of the linear bucket that is being redistributed.
 */
export const redistributeLinearBuckets = (
  data: HistogramChartData,
  linearBucketIndex: number,
  exponentialBuckets: Bucket[],
  engagedExponentialBucketsIndexes: number[]
): void => {
  const [, lowerBound, upperBound, count] = data.buckets[linearBucketIndex] as BucketTuple;
  const linearBucketBoundsDiff = Math.abs(parseFloat(upperBound) - parseFloat(lowerBound));

  /* calculate fractions based on the overlap */
  const fractions = engagedExponentialBucketsIndexes.map((i, idx) => {
    const { ub, lb } = exponentialBuckets[i] as Bucket;
    if (idx !== engagedExponentialBucketsIndexes.length - 1) {
      return parseFloat(lowerBound) > lb
        ? Math.abs(ub - parseFloat(lowerBound)) / linearBucketBoundsDiff
        : Math.abs(ub - lb) / linearBucketBoundsDiff;
    }
    return Math.abs(parseFloat(upperBound) - lb) / linearBucketBoundsDiff;
  });

  engagedExponentialBucketsIndexes.forEach((engagedExponentialBucketIndex, idx) => {
    (exponentialBuckets[engagedExponentialBucketIndex] as Bucket).count +=
      (fractions[idx] as number) * parseFloat(count);
  });
};

/**
 * Converts linear buckets to exponential buckets. The bins of the linear buckets are placed into the exponential buckets accordingly.
 * The function mutates the exponential buckets in place.
 */
export const convertLinearToExponentialBuckets = (data: HistogramChartData, exponentialBuckets: Bucket[]): void => {
  if (!data.buckets?.length) throw Error(Exceptions.EMPTY_BUCKETS);

  data.buckets.forEach(([_, lowerBound, upperBound, count], index) => {
    let equivalentBucketIndex = 0;
    for (let i = 0; i < exponentialBuckets.length; i += 1) {
      const { lb } = exponentialBuckets[i] as Bucket;
      if (parseFloat(lowerBound) >= lb) {
        equivalentBucketIndex = i;
        continue;
      }
      break;
    }

    if (parseFloat(upperBound) <= (exponentialBuckets[equivalentBucketIndex] as Bucket).ub) {
      /* already fits into the exponential bucket, no merge is needed  */
      (exponentialBuckets[equivalentBucketIndex] as Bucket).count += parseFloat(count);
    } else {
      const engagedExponentialBucketsIndexes: number[] = [];
      let cursor = equivalentBucketIndex;
      let breakLoop = false;

      while (!breakLoop) {
        if (parseFloat(upperBound) > (exponentialBuckets[cursor] as Bucket).ub) {
          engagedExponentialBucketsIndexes.push(cursor);
          cursor += 1;
          continue;
        }

        engagedExponentialBucketsIndexes.push(cursor);
        breakLoop = true;
      }

      redistributeLinearBuckets(data, index, exponentialBuckets, engagedExponentialBucketsIndexes);
    }
  });
};
