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

import type { TimeSeries } from '@perses-dev/spec';

import { convertResultsToTimeSeries, getTimeScaleForSeries } from './get-splunk-time-series-data';
import { SplunkTimeSeriesQuery } from './SplunkTimeSeriesQuery';

describe('SplunkTimeSeriesQuery', () => {
  it('should create initial options with empty query', () => {
    const initialOptions = SplunkTimeSeriesQuery.createInitialOptions();
    expect(initialOptions).toEqual({ query: '' });
  });

  it('should resolve unique variable dependencies, deduplicating repeats', () => {
    if (!SplunkTimeSeriesQuery.dependsOn) throw new Error('dependsOn is not defined');
    const { variables } = SplunkTimeSeriesQuery.dependsOn(
      {
        query: 'search index=$index sourcetype=$sourcetype | stats count by $index',
      },
      {} as never,
    );
    expect(variables).toEqual(expect.arrayContaining(['index', 'sourcetype']));
    expect(variables).toHaveLength(2);
  });
});

describe('convertResultsToTimeSeries', () => {
  it('converts timestamps to milliseconds sorted by ascending time', () => {
    expect(
      convertResultsToTimeSeries([
        { _time: '2025-01-01T00:01:00.000Z', count: 5 },
        { _time: '2025-01-01T00:00:00.000Z', count: '3' },
      ]),
    ).toEqual([
      {
        name: 'count',
        labels: { metric: 'count' },
        values: [
          [1735689600000, 3],
          [1735689660000, 5],
        ],
      },
    ]);
  });
});

function series(timestamps: number[]): TimeSeries[] {
  return [{ name: 'count', values: timestamps.map((timestamp): [number, number] => [timestamp, 1]) }];
}

describe('getTimeScaleForSeries', () => {
  const hourMs = 3_600_000;
  const requestedRange = { start: new Date(Date.UTC(2025, 0, 1, 0, 17)), end: new Date(Date.UTC(2025, 0, 2, 0, 17)) };

  it('infers the step from Splunk buckets and aligns the grid start on the data', () => {
    const firstBucket = Date.UTC(2025, 0, 1, 1);
    const result = getTimeScaleForSeries(
      series([firstBucket, firstBucket + hourMs, firstBucket + 3 * hourMs]),
      requestedRange,
      15_000,
    );

    expect(result.stepMs).toBe(hourMs);
    expect(result.timeRange.start).toEqual(new Date(Date.UTC(2025, 0, 1, 0)));
    expect(result.timeRange.end).toEqual(requestedRange.end);
  });

  it('does not depend on the suggested step', () => {
    const timestamps = [Date.UTC(2025, 0, 1, 1), Date.UTC(2025, 0, 1, 2)];
    expect(getTimeScaleForSeries(series(timestamps), requestedRange, 15_000)).toEqual(
      getTimeScaleForSeries(series(timestamps), requestedRange, 300_000),
    );
  });

  it('extends the time range to include data outside of the requested range', () => {
    const before = Date.UTC(2024, 11, 31, 23);
    const after = Date.UTC(2025, 0, 2, 1);
    const result = getTimeScaleForSeries(series([before, after]), requestedRange, 15_000);

    expect(result.timeRange).toEqual({ start: new Date(before), end: new Date(after) });
  });

  it('falls back to the suggested step without enough points', () => {
    expect(getTimeScaleForSeries([], requestedRange, 15_000)).toEqual({ timeRange: requestedRange, stepMs: 15_000 });
    expect(getTimeScaleForSeries(series([Date.UTC(2025, 0, 1, 1)]), requestedRange, 15_000).stepMs).toBe(15_000);
  });

  it('caps the number of grid points for irregular timestamps', () => {
    const start = requestedRange.start.getTime();
    const result = getTimeScaleForSeries(series([start + 1, start + 3]), requestedRange, 15_000);

    expect(result.stepMs).toBe(Math.ceil((24 * hourMs) / 10_000));
  });
});
