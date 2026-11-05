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

import { CLOUDWATCH_MAX_DATAPOINTS } from './constants';
import { getEffectivePeriod } from './period';

const HOUR = 3600;
const DAY = 24 * HOUR;

describe('getEffectivePeriod', () => {
  it('keeps the period of the query when it fits', () => {
    expect(getEffectivePeriod(60, HOUR, 1)).toBe(60);
    expect(getEffectivePeriod(300, DAY, 1)).toBe(300);
  });

  it('increases the period so a long time range fits in the datapoint limit', () => {
    // 7 days at 60s would be 10080 datapoints.
    expect(getEffectivePeriod(60, 7 * DAY, 1)).toBe(120);
    expect(getEffectivePeriod(60, 31 * DAY, 1)).toBe(300);
  });

  it('shares the datapoint limit between the returned series', () => {
    // 7 series over a day at 60s would be 10080 datapoints.
    expect(getEffectivePeriod(60, DAY, 7)).toBe(120);
    expect(getEffectivePeriod(60, DAY, 6)).toBe(60);
  });

  it('follows the step suggested by the panel, rounded up to a multiple of 60', () => {
    expect(getEffectivePeriod(60, DAY, 1, 90_000)).toBe(120);
    expect(getEffectivePeriod(300, DAY, 1, 30_000)).toBe(300);
  });

  it('stays within the CloudWatch periods', () => {
    expect(getEffectivePeriod(0, 60, 1)).toBe(60);
    expect(getEffectivePeriod(60, 31 * DAY, 20, 7 * DAY * 1000)).toBe(DAY);
  });

  it('never exceeds the datapoint limit of the proxy', () => {
    for (const range of [HOUR, DAY, 7 * DAY, 14 * DAY, 31 * DAY]) {
      for (const series of [1, 3, 7, 20]) {
        const period = getEffectivePeriod(60, range, series);
        expect(Math.ceil(range / period) * series).toBeLessThanOrEqual(CLOUDWATCH_MAX_DATAPOINTS);
        expect(period % 60).toBe(0);
      }
    }
  });
});
