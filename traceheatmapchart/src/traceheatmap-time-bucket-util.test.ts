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

import { findScale, MILLISECONDS_TIME_SCALE } from './traceheatmap-time-bucket-util';

const formatDate = (date: number) => new Date(date).toISOString().split('T')[0];
type TestBody = { start: number; end: number; desc: string; testPurpose: string; exp: string };

describe('traceheatmap-time-bucket-util', () => {
  describe('scaling', () => {
    describe('buckets', () => {
      const tests: TestBody[] = [
        {
          start: 1725896153082,
          end: 1783956953082,
          desc: 'should include 2024, 2025',
          testPurpose: 'yearly scaled',
          exp: '2024-2025,2025-2026',
        },
        {
          start: 1814400000000,
          end: 1817078400000,
          desc: 'should include July 2027',
          testPurpose: 'monthly scaled',
          exp: 'July',
        },
        {
          start: 1782864000000,
          end: 1786492800000,
          desc: 'should include July and August 2026',
          testPurpose: 'stretched monthly scaled',
          exp: 'July,August',
        },
        {
          start: 1782864000000,
          end: 1789171200000,
          desc: 'should include July, August, and September',
          testPurpose: 'stretched monthly scaled',
          exp: 'July,August,September',
        },
        {
          start: 1783987200000,
          end: 1784592000000,
          desc: 'should include 14th to 21st of July 2026',
          testPurpose: 'weekly scaled',
          exp: 'July 14 - July 21',
        },
        {
          start: 1783987200000,
          end: 1784851200000,
          desc: 'should include 14th to 28th of July 2026',
          testPurpose: 'weekly scaled',
          exp: 'July 14 - July 21,July 21 - July 28',
        },
        {
          start: 1784937600000,
          end: 1785715200000,
          desc: 'should include July 25th to 8th Aug 2026',
          testPurpose: 'stretched weekly scaled',
          exp: 'July 25 - August 1,August 1 - August 8',
        },
        {
          start: 1782864000000,
          end: 1785456000000,
          desc: 'should include the entire July 2026 and the beginning of August',
          testPurpose: 'entire month - weekly scaled',
          exp: 'July 1 - July 8,July 8 - July 15,July 15 - July 22,July 22 - July 29,July 29 - August 5',
        },
        {
          start: 1769904000000,
          end: 1772236800000,
          desc: 'should include the entire Feb (28 days) 2026',
          testPurpose: 'entire Feb (28 days) - weekly scaled',
          exp: 'February 1 - February 8,February 8 - February 15,February 15 - February 22,February 22 - March 1',
        },
        {
          start: 1706745600000,
          end: 1709164800000,
          desc: 'should include the entire Feb (29 days - leap year) 2024',
          testPurpose: 'entire Feb (29 days) - weekly scaled',
          exp: 'February 1 - February 8,February 8 - February 15,February 15 - February 22,February 22 - February 29',
        },
        {
          start: 1783987200000,
          end: 1784091600000,
          desc: 'should include week days',
          testPurpose: 'daily scaled',
          exp: 'Tuesday,Wednesday',
        },
        {
          start: 1783990800000,
          end: 1784037600000,
          desc: 'should include hours',
          testPurpose: 'hourly scaled',
          exp: '1 AM - 2 AM,2 AM - 3 AM,3 AM - 4 AM,4 AM - 5 AM,5 AM - 6 AM,6 AM - 7 AM,7 AM - 8 AM,8 AM - 9 AM,9 AM - 10 AM,10 AM - 11 AM,11 AM - 12 PM,12 PM - 1 PM,1 PM - 2 PM',
        },
        {
          start: 1784640900000,
          end: 1784648220000,
          desc: 'should include hours',
          testPurpose: 'hourly scaled',
          exp: '1 PM - 2 PM,2 PM - 3 PM,3 PM - 4 PM',
        },
        {
          start: 1784640900000,
          end: 1784648700000,
          desc: 'should include hours',
          testPurpose: 'hourly scaled',
          exp: '1 PM - 2 PM,2 PM - 3 PM,3 PM - 4 PM',
        },
        {
          start: 1783990800000,
          end: 1784073599000,
          desc: 'should include the entire hours of the day',
          testPurpose: 'hourly scaled',
          exp: '1 AM - 2 AM,2 AM - 3 AM,3 AM - 4 AM,4 AM - 5 AM,5 AM - 6 AM,6 AM - 7 AM,7 AM - 8 AM,8 AM - 9 AM,9 AM - 10 AM,10 AM - 11 AM,11 AM - 12 PM,12 PM - 1 PM,1 PM - 2 PM,2 PM - 3 PM,3 PM - 4 PM,4 PM - 5 PM,5 PM - 6 PM,6 PM - 7 PM,7 PM - 8 PM,8 PM - 9 PM,9 PM - 10 PM,10 PM - 11 PM,11 PM - 12 AM',
        },
        {
          start: 1784066400000,
          end: 1784088000000,
          desc: 'should include hours of 14th and 15th of July 2026',
          testPurpose: 'stretched hourly scaled',
          exp: '10 PM - 11 PM,11 PM - 12 AM,12 AM - 1 AM,1 AM - 2 AM,2 AM - 3 AM,3 AM - 4 AM',
        },
        {
          start: 1784088060000,
          end: 1784088300000,
          desc: 'should include minutes',
          testPurpose: 'minutes scaled',
          exp: '04:01-04:02,04:02-04:03,04:03-04:04,04:04-04:05',
        },
        {
          start: 1784159880000,
          end: 1784160300000,
          desc: 'should include minutes',
          testPurpose: 'stretched minutes scaled',
          exp: '23:58-23:59,23:59-00:00,00:00-00:01,00:01-00:02,00:02-00:03,00:03-00:04,00:04-00:05',
        },
        {
          start: 1784649599000,
          end: 1784649605000,
          desc: 'should include seconds',
          testPurpose: 'seconds scaled',
          exp: '59-0,0-1,1-2,2-3,3-4,4-5',
        },
      ];

      tests.forEach((tst) => {
        const { start, end, exp, testPurpose } = tst;

        const { getBuckets } = MILLISECONDS_TIME_SCALE.find((i) => i.scale === findScale(start, end))!;
        const buckets = getBuckets(start, end);

        test(`from ${formatDate(start)} to ${formatDate(end)}: ${tst.desc} demonstrates: ${testPurpose}`, () => {
          const labels = buckets.map((i) => i.label).join(',');
          expect(labels).toBe(exp);
        });

        test(`generated buckets ranging from ${buckets[0]?.startTimestamp} to ${buckets[buckets.length - 1]?.startTimestamp} should be sorted ascendingly`, () => {
          const startTimestamps = buckets.map((i) => i.startTimestamp);
          let sortedBuckets = true;
          for (let i = 0; i < startTimestamps.length; i += 1) {
            if (i === startTimestamps.length - 1) {
              break;
            }
            if (startTimestamps[i]! > startTimestamps[i + 1]!) {
              sortedBuckets = false;
              break;
            }
          }
          expect(sortedBuckets).toBe(true);
        });
      });
    });
  });
});
