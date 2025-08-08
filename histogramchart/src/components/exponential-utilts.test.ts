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

import {
  convertLinearToExponentialBuckets,
  ExponentialBase,
  generateExponentialBucketsWithOffset,
  redistributeLinearBuckets,
} from './exponential-utils';
import { HistogramChartData } from './HistogramChart';

describe('exponential-utils', () => {
  describe('redistributeLinearBuckets', () => {
    const testData: Array<{
      linearBucket: HistogramChartData;
      base: ExponentialBase;
      expectations: { total: number; bucketsCount: number };
    }> = [
      { base: 2, linearBucket: { buckets: [[0, '0', '10', '10']] }, expectations: { total: 10, bucketsCount: 5 } },
      { base: 2, linearBucket: { buckets: [[0, '0', '10', '100']] }, expectations: { total: 100, bucketsCount: 5 } },
      { base: 2, linearBucket: { buckets: [[0, '0', '10', '3']] }, expectations: { total: 3, bucketsCount: 5 } },
      { base: 2, linearBucket: { buckets: [[0, '0', '20', '10']] }, expectations: { total: 10, bucketsCount: 6 } },
      { base: 2, linearBucket: { buckets: [[0, '0', '20', '100']] }, expectations: { total: 100, bucketsCount: 6 } },
      { base: 2, linearBucket: { buckets: [[0, '0', '20', '3']] }, expectations: { total: 3, bucketsCount: 6 } },
      { base: 2, linearBucket: { buckets: [[0, '10', '30', '100']] }, expectations: { total: 100, bucketsCount: 6 } },
      { base: 2, linearBucket: { buckets: [[0, '0', '5', '100']] }, expectations: { total: 100, bucketsCount: 4 } },
      { base: 2, linearBucket: { buckets: [[0, '0', '3', '100']] }, expectations: { total: 100, bucketsCount: 3 } },
      { base: 10, linearBucket: { buckets: [[0, '0', '10', '100']] }, expectations: { total: 100, bucketsCount: 2 } },
      { base: 4, linearBucket: { buckets: [[0, '0', '10', '100']] }, expectations: { total: 100, bucketsCount: 3 } },
    ];

    it('should redistribute linear buckets to exponential ones proportionally', () => {
      testData.forEach((tc) => {
        const exponentialBuckets = generateExponentialBucketsWithOffset(tc.linearBucket, tc.base);
        redistributeLinearBuckets(
          tc.linearBucket,
          0,
          exponentialBuckets,
          exponentialBuckets.map((_, idx) => idx)
        );
        const total = exponentialBuckets.map((i) => i.count).reduce((p, c) => p + c, 0);
        expect(parseFloat(total.toFixed(10))).toBe(tc.expectations.total);
        expect(exponentialBuckets.length).toBe(tc.expectations.bucketsCount);
      });
    });
  });

  describe('convertLinearToExponentialBuckets', () => {
    describe('Sample: 25 students -  score (out of 50)', () => {
      const studentsScores: HistogramChartData = {
        buckets: [
          [0, '0', '10', '5'],
          [1, '10', '20', '15'],
          [2, '20', '30', '8'],
          [3, '30', '40', '17'],
          [4, '40', '50', '5'],
        ],
      };

      it('should have 7 buckets distributed proportionally', () => {
        const exponentialBuckets = generateExponentialBucketsWithOffset(studentsScores, 2);
        convertLinearToExponentialBuckets(studentsScores, exponentialBuckets);
        expect(exponentialBuckets.length).toBe(7);
        const total = exponentialBuckets.map((i) => i.count).reduce((prev, current) => prev + current, 0);
        expect(parseFloat(total.toFixed(10))).toBe(50);
      });
    });

    describe('Sample: Income and society ', () => {
      const incomeSociety: HistogramChartData = {
        buckets: [
          [0, '0', '500', '50'],
          [1, '500', '1000', '100'],
          [2, '1000', '2000', '800'],
          [3, '2000', '3000', '50'],
        ],
      };

      it('should have buckets  distributed proportionally', () => {
        const exponentialBuckets = generateExponentialBucketsWithOffset(incomeSociety, 2);
        convertLinearToExponentialBuckets(incomeSociety, exponentialBuckets);
        expect(exponentialBuckets.length).toBe(13);
        const total = exponentialBuckets.map((i) => i.count).reduce((prev, current) => prev + current, 0);
        expect(parseFloat(total.toFixed(10))).toBe(1000);
      });
    });

    describe('Sample: Income and employees', () => {
      const incomeEmployees: HistogramChartData = {
        buckets: [
          [0, '500', '1000', '20'],
          [1, '1000', '1500', '200'],
          [2, '1500', '2000', '350'],
          [3, '2000', '2500', '300'],
          [4, '2500', '3000', '250'],
          [5, '3000', '3500', '200'],
          [6, '3500', '4000', '100'],
          [7, '4000', '4500', '20'],
          [8, '4500', '5000', '2'],
          [9, '5000', '5500', '5'],
        ],
      };

      it('should have buckets  distributed proportionally', () => {
        const exponentialBuckets = generateExponentialBucketsWithOffset(incomeEmployees, 2);
        convertLinearToExponentialBuckets(incomeEmployees, exponentialBuckets);
        expect(exponentialBuckets.length).toBe(14);
        const total = exponentialBuckets.map((i) => i.count).reduce((prev, current) => prev + current, 0);
        expect(parseFloat(total.toFixed(10))).toBe(1447);
      });
    });
  });
});
