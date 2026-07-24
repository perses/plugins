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

import { ExponentialBase, getDurationBuckets } from './traceheatmap-duration-bucket-util';

type TestBody = { durations: number[]; base: ExponentialBase; desc: string; exp: string; testPurpose: string };

describe('traceheatmap-duration-bucket-util', () => {
  describe('generate buckets', () => {
    const tests: TestBody[] = [
      {
        durations: [1, 2, 3, 4, 5, 6, 7, 8],
        base: 2,
        desc: 'a simple test for exponential buckets demonstration',
        exp: '1,2,4,8',
        testPurpose: 'demonstration base 2 - helps to understand bucketing',
      },
      {
        durations: [1, 2, 3, 4, 5, 6, 7, 8],
        base: 10,
        desc: 'a simple test for exponential buckets demonstration',
        exp: '1,10',
        testPurpose: 'demonstration base 10 - helps to understand bucketing',
      },
      {
        durations: [65, 51, 50, 46, 29, 37, 31],
        base: 2,
        desc: 'should range from 16 to +128',
        exp: '16,32,64,128',
        testPurpose: 'realistic network latency',
      },
      {
        durations: [65, 51, 1500, 46, 29, 37, 31],
        base: 2,
        desc: 'should range from 16 to +2048',
        exp: '16,32,64,128,256,512,1024,2048',
        testPurpose: 'realistic network latency with a considerable lag',
      },
      {
        durations: [65, 51, 1500, 46, 29, 37, 31],
        base: 10,
        desc: 'should range from 10 to +10000',
        exp: '10,100,1000,10000',
        testPurpose: 'realistic network latency with a considerable lag',
      },
      {
        durations: [0.5, 0.4, 1, 10, 2],
        base: 2,
        desc: 'should range from 0.25 to +16',
        exp: '0.25,0.5,1,2,4,8,16',
        testPurpose: 'minimum is microseconds 0<x<1',
      },
      {
        durations: [0.5, 0.4, 1, 10, 2],
        base: 10,
        desc: 'should range from 0.1 to +10',
        exp: '0.1,1,10',
        testPurpose: 'minimum is microseconds 0<x<1',
      },
      {
        durations: [0.4, 0.5, 0.7],
        base: 2,
        desc: 'should range from 0.25 to +1',
        exp: '0.25,0.5,1',
        testPurpose: 'both min and max are microseconds 0<x<1',
      },
    ];

    tests.forEach((tst) => {
      const { durations, base, exp, desc, testPurpose } = tst;
      const buckets = getDurationBuckets(durations, base);
      test(`base:${base}-${desc}-${testPurpose}`, () => {
        const starts = buckets.map((b) => b.start).join(',');
        expect(starts).toBe(exp);
      });

      test('buckets should be sorted', () => {
        let sorted = true;
        for (let i = 0; i < buckets.length; i += 1) {
          if (i === buckets.length) {
            break;
          }
          if (buckets[i]! > buckets[i + 1]!) {
            sorted = false;
            break;
          }
        }
        expect(sorted).toBe(true);
      });
    });
  });
});
