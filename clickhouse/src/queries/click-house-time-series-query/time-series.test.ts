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

import { stubResponse } from '../../test/stubs';
import { buildExemplars, buildTimeSeries, MAX_SERIES } from './time-series';

const TIME: [string, string] = ['time', "DateTime('UTC')"];
const HOUR = 60 * 60 * 1000;
const rangeStart = Date.UTC(2026, 0, 1, 10);
const options = { instant: rangeStart + HOUR, rangeStart, intervalMs: 15_000 };

function at(minutes: number): string {
  return new Date(rangeStart + minutes * 60_000).toISOString().replace('.000Z', 'Z');
}

function ms(minutes: number): number {
  return rangeStart + minutes * 60_000;
}

function second(seconds: number): string {
  return new Date(rangeStart + seconds * 1000).toISOString().replace('.000', '');
}

// Step of a series with a point at each of the times, which are in the time zone of Paris.
function stepOf(times: string[]): number {
  return buildTimeSeries(
    stubResponse(
      [
        ['time', "DateTime('Europe/Paris')"],
        ['flights', 'UInt32'],
      ],
      times.map((time) => [time, 1]),
    ),
    options,
  ).stepMs;
}

describe('buildTimeSeries', () => {
  it('returns one series per value of the label columns', () => {
    const built = buildTimeSeries(
      stubResponse(
        [TIME, ['service', 'LowCardinality(String)'], ['region', 'String'], ['requests', 'UInt64']],
        [
          [at(0), 'web', 'eu', '5'],
          [at(0), 'api', 'eu', '7'],
          [at(1), 'api', 'eu', '9'],
        ],
      ),
      options,
    );

    expect(built.series).toEqual([
      {
        name: '{service="api", region="eu"}',
        labels: { service: 'api', region: 'eu' },
        values: [
          [ms(0), 7],
          [ms(1), 9],
        ],
      },
      { name: '{service="web", region="eu"}', labels: { service: 'web', region: 'eu' }, values: [[ms(0), 5]] },
    ]);
    expect(built.stepMs).toBe(60_000);
  });

  it('names the series after their value column when there are several', () => {
    const wide = buildTimeSeries(
      stubResponse([TIME, ['avg_cpu', 'Float64'], ['max_memory', 'UInt32']], [[at(0), 2.5, 277]]),
      options,
    );
    const long = buildTimeSeries(
      stubResponse([TIME, ['service', 'String'], ['cpu', 'Float64'], ['memory', 'UInt32']], [[at(0), 'api', 2.5, 277]]),
      options,
    );

    expect(wide.series.map((series) => series.name)).toEqual(['avg_cpu', 'max_memory']);
    expect(long.series.map((series) => series.name)).toEqual(['cpu{service="api"}', 'memory{service="api"}']);
    expect(long.series[0]?.labels).toEqual({ __name__: 'cpu', service: 'api' });
  });

  it('reads a result without a time column as a table: one point per row, in the order of the rows', () => {
    const built = buildTimeSeries(
      stubResponse(
        [
          ['service', 'String'],
          ['spans', 'UInt64'],
        ],
        [
          ['web', '30'],
          ['api', '20'],
          ['db', '10'],
        ],
      ),
      options,
    );

    expect(built.series.map((series) => [series.name, series.values])).toEqual([
      ['{service="web"}', [[options.instant, 30]]],
      ['{service="api"}', [[options.instant, 20]]],
      ['{service="db"}', [[options.instant, 10]]],
    ]);
    // A single step spans the time range: charts do not draw the rows as gaps.
    expect(built.stepMs).toBe(HOUR);
  });

  it('formats the name of the series from their labels', () => {
    const built = buildTimeSeries(
      stubResponse([TIME, ['service', 'String'], ['value', 'Float64']], [[at(0), 'api', 1]]),
      { ...options, seriesNameFormat: '{{service}} ({{ missing }})' },
    );

    expect(built.series[0]?.formattedName).toBe('api ()');
  });

  it('keeps the name of a series its format gives no name to', () => {
    const built = buildTimeSeries(stubResponse([TIME, ['logs', 'UInt64']], [[at(0), '3']]), {
      ...options,
      seriesNameFormat: '{{level}}',
    });

    expect(built.series[0]).toMatchObject({ name: 'logs' });
    expect(built.series[0]?.formattedName).toBeUndefined();
  });

  it('flattens maps into labels and ignores the arrays', () => {
    const built = buildTimeSeries(
      stubResponse(
        [TIME, ['Attributes', 'Map(LowCardinality(String), String)'], ['Tags', 'Array(String)'], ['value', 'Float64']],
        [[at(0), { state: 'used', 'host.name': 'a' }, ['x'], 1]],
      ),
      options,
    );

    expect(built.series[0]?.labels).toEqual({ 'Attributes.state': 'used', 'Attributes.host.name': 'a' });
  });

  it('reads the rows of the metric tables of OpenTelemetry without their bookkeeping columns', () => {
    const built = buildTimeSeries(
      stubResponse(
        [
          ['ServiceName', 'LowCardinality(String)'],
          ['MetricName', 'String'],
          ['StartTimeUnix', 'DateTime64(9)'],
          ['TimeUnix', 'DateTime64(9)'],
          ['Value', 'Float64'],
          ['Flags', 'UInt32'],
        ],
        [['api', 'cpu', '2026-01-01T00:00:00Z', at(0), 0.5, 0]],
      ),
      options,
    );

    expect(built.series).toEqual([
      {
        name: '{ServiceName="api", MetricName="cpu"}',
        labels: { ServiceName: 'api', MetricName: 'cpu' },
        values: [[ms(0), 0.5]],
      },
    ]);
  });

  it('puts the points on a time grid starting at the time range', () => {
    const built = buildTimeSeries(
      stubResponse(
        [TIME, ['value', 'Float64']],
        [
          [at(1), 1],
          [at(2), 2],
          [at(3), 3],
        ],
      ),
      { ...options, rangeStart: rangeStart + 30_000 },
    );

    expect(built.stepMs).toBe(60_000);
    expect(built.start).toBe(ms(0));
  });

  it('keeps every row of a series with holes at its time', () => {
    const response = stubResponse(
      [TIME, ['errors', 'UInt64']],
      [
        [at(1), '10'],
        [at(2), '20'],
        [at(7), '30'],
        [at(20), '40'],
      ],
    );

    const built = buildTimeSeries(response, options);

    // The grid all the rows are on, not the one of their longest hole.
    expect(built.stepMs).toBe(60_000);
    expect(built.series[0]?.values).toEqual([
      [ms(1), 10],
      [ms(2), 20],
      [ms(7), 30],
      [ms(20), 40],
    ]);
    expect(built.notices).toEqual([]);
  });

  it('draws rows grouped by a shorter interval than the one they are written at as a line', () => {
    // A metric written about every minute, grouped by intervals of 2 seconds.
    const seconds = [48, 108, 168, 226, 288, 348, 410, 468];
    const built = buildTimeSeries(
      stubResponse(
        [TIME, ['value', 'Float64']],
        seconds.map((time, index) => [second(time), index]),
      ),
      { ...options, intervalMs: 2000 },
    );

    expect(built.stepMs).toBe(60_000);
    expect(built.series[0]?.values.map(([timestamp]) => (timestamp - rangeStart) / 1000)).toEqual([
      48, 108, 168, 228, 288, 348, 408, 468,
    ]);
  });

  it('keeps daily rows daily across a daylight saving time change', () => {
    expect(stepOf(['2026-01-01 00:00:00', '2026-01-02 00:00:00', '2026-01-03 00:00:00'])).toBe(24 * HOUR);
    // The day of the switch to summer time lasts 23 hours, and the one of the switch back 25.
    expect(stepOf(['2026-03-28 00:00:00', '2026-03-29 00:00:00', '2026-03-30 00:00:00'])).toBe(24 * HOUR);
    expect(stepOf(['2026-10-24 00:00:00', '2026-10-25 00:00:00', '2026-10-26 00:00:00'])).toBe(24 * HOUR);
  });

  it('draws every row of calendar intervals close to its time', () => {
    const months = Array.from({ length: 36 }, (_unused, month) => Date.UTC(2023, month, 1));
    const built = buildTimeSeries(
      stubResponse(
        [
          ['month', 'Date'],
          ['revenue', 'UInt32'],
        ],
        months.map((month, index) => [new Date(month).toISOString().slice(0, 10), index]),
      ),
      { instant: Date.UTC(2026, 0, 1), rangeStart: Date.UTC(2023, 0, 1), intervalMs: 24 * HOUR },
    );

    const values = built.series[0]?.values ?? [];
    expect(values.map(([, revenue]) => revenue)).toEqual(months.map((_month, index) => index));
    const daysOff = values.map(([timestamp], index) => Math.abs(timestamp - (months[index] ?? 0)) / (24 * HOUR));
    expect(Math.max(...daysOff)).toBeLessThan(4);
    // A round step: charts draw the series of several queries on the common divisor of their steps.
    expect(built.stepMs).toBe(30.5 * 24 * HOUR);
    expect(built.notices).toEqual([]);
  });

  it('keeps the points of series written at about regular intervals in line, whatever their phase', () => {
    // Two collectors writing about every minute, half a minute apart.
    const first = [0, 61, 120, 181, 240, 299, 360];
    const other = [30, 91, 149, 211, 270, 330, 389];
    const built = buildTimeSeries(
      stubResponse(
        [TIME, ['host', 'String'], ['load', 'Float64']],
        [...first.map((time, index) => [second(time), 'a', index]), ...other.map((time) => [second(time), 'b', 1])],
      ),
      options,
    );

    expect(built.stepMs).toBe(60_000);
    expect(built.series.map((entry) => entry.values.map(([timestamp]) => (timestamp - rangeStart) / 60_000))).toEqual([
      [0, 1, 2, 3, 4, 5, 6],
      [1, 2, 3, 4, 5, 6, 7],
    ]);
    expect(built.notices).toEqual([]);
  });

  it('bounds the time grid of rows at irregular intervals, and warns about the ones it can not draw', () => {
    const day = 24 * HOUR;
    // Events, to the millisecond: charts would otherwise fill a slot per millisecond of the time range.
    const offsets = [0, 1, 2, 5_000, 12_345, 3_600_000, 40_000_000];
    const built = buildTimeSeries(
      stubResponse(
        [
          ['time', "DateTime64(3, 'UTC')"],
          ['duration', 'Float64'],
        ],
        offsets.map((offset, index) => [new Date(rangeStart + offset).toISOString(), index]),
      ),
      { instant: rangeStart + day, rangeStart, intervalMs: 300_000 },
    );

    expect(built.stepMs).toBe(10_000);
    expect(built.series[0]?.values).toEqual([
      [rangeStart, 2],
      [rangeStart + 10_000, 4],
      [rangeStart + 3_600_000, 5],
      [rangeStart + 40_000_000, 6],
    ]);
    expect(built.notices[0]?.message).toMatch(/3 of them are hidden by the next point of their series/);
  });

  it('keeps the gaps of a series and leaves out the series without any value', () => {
    const built = buildTimeSeries(
      stubResponse(
        [TIME, ['a', 'Nullable(Float64)'], ['b', 'Nullable(Float64)']],
        [
          [at(0), 1, null],
          [at(1), null, null],
        ],
      ),
      options,
    );

    expect(built.series).toEqual([
      {
        name: 'a',
        labels: { __name__: 'a' },
        values: [
          [ms(0), 1],
          [ms(1), null],
        ],
      },
    ]);
  });

  it('converts the explicit bucket histograms of OpenTelemetry', () => {
    const built = buildTimeSeries(
      stubResponse(
        [
          ['TimeUnix', "DateTime('UTC')"],
          ['ServiceName', 'String'],
          ['Count', 'UInt64'],
          ['Sum', 'Float64'],
          ['BucketCounts', 'Array(UInt64)'],
          ['ExplicitBounds', 'Array(Float64)'],
        ],
        [[at(0), 'api', '4', 12.5, ['1', '0', '3'], [2, 4]]],
      ),
      options,
    );

    expect(built.series).toEqual([
      {
        name: '{ServiceName="api"}',
        labels: { ServiceName: 'api' },
        // Like a native histogram of Prometheus, the series plots the sum of the observations.
        values: [[ms(0), 12.5]],
        histograms: [
          [
            ms(0) / 1000,
            {
              count: 4,
              sum: '12.5',
              // The unbounded first and last buckets are given bounds, and the empty one is left out.
              buckets: [
                [0, '0', '2', '1'],
                [0, '4', '6', '3'],
              ],
            },
          ],
        ],
      },
    ]);
  });

  it('converts the exponential histograms of OpenTelemetry', () => {
    const built = buildTimeSeries(
      stubResponse(
        [
          ['TimeUnix', "DateTime('UTC')"],
          ['Count', 'UInt64'],
          ['Sum', 'Float64'],
          ['Scale', 'Int32'],
          ['ZeroCount', 'UInt64'],
          ['PositiveOffset', 'Int32'],
          ['PositiveBucketCounts', 'Array(UInt64)'],
          ['NegativeOffset', 'Int32'],
          ['NegativeBucketCounts', 'Array(UInt64)'],
        ],
        [[at(0), '5', 9, 0, '1', 0, ['2', '0', '1'], 0, ['1']]],
      ),
      options,
    );

    expect(built.series[0]?.histograms?.[0]?.[1].buckets).toEqual([
      [1, '-2', '-1', '1'],
      [3, '0', '0', '1'],
      [0, '1', '2', '2'],
      [0, '4', '8', '1'],
    ]);
  });

  it('reads the exemplars stored with the data points of OpenTelemetry', () => {
    const built = buildTimeSeries(
      stubResponse(
        [
          ['TimeUnix', "DateTime('UTC')"],
          ['ServiceName', 'String'],
          ['Value', 'Float64'],
          ['Exemplars.TimeUnix', "Array(DateTime64(9, 'UTC'))"],
          ['Exemplars.Value', 'Array(Float64)'],
          ['Exemplars.TraceId', 'Array(String)'],
          ['Exemplars.SpanId', 'Array(String)'],
          ['Exemplars.FilteredAttributes', 'Array(Map(String, String))'],
        ],
        [[at(1), 'api', 3, [at(0)], [0.25], ['abc'], ['def'], [{ route: '/cart' }]]],
      ),
      options,
    );

    expect(built.exemplars).toEqual([
      {
        seriesLabels: { ServiceName: 'api' },
        exemplars: [{ timestamp: ms(0), value: 0.25, labels: { route: '/cart', trace_id: 'abc', span_id: 'def' } }],
      },
    ]);
  });

  it('warns about the rows and the series it leaves out', () => {
    const notNumeric = buildTimeSeries(stubResponse([TIME, ['value', 'String']], [[at(0), '1']]), options);
    const badTime = buildTimeSeries(
      stubResponse(
        [
          ['time', 'String'],
          ['value', 'Float64'],
        ],
        [
          ['soon', 1],
          [at(0), 2],
        ],
      ),
      options,
    );
    const tooMany = buildTimeSeries(
      stubResponse(
        [TIME, ['id', 'String'], ['value', 'Float64']],
        Array.from({ length: MAX_SERIES + 1 }, (_unused, index) => [at(0), String(index), 1]),
      ),
      options,
    );

    expect(notNumeric.notices[0]?.message).toMatch(/no numeric column/);
    expect(badTime.series[0]?.values).toEqual([[ms(0), 2]]);
    expect(badTime.notices[0]?.message).toMatch(/1 rows were skipped/);
    expect(tooMany.series).toHaveLength(MAX_SERIES);
    expect(tooMany.notices[0]?.message).toMatch(/only the first 1000 are shown/);
  });
});

describe('buildExemplars', () => {
  const EXEMPLARS = stubResponse(
    [TIME, ['value', 'Float64'], ['service', 'String'], ['trace_id', 'String']],
    [
      [at(2), 80, 'api', 't2'],
      [at(1), 120, 'api', 't1'],
      [at(1), 15, 'web', 't3'],
    ],
  );

  it('attaches each exemplar to the series of its label columns', () => {
    const series = ['api', 'web'].map((service) => ({ name: service, values: [], labels: { service } }));

    expect(buildExemplars(EXEMPLARS, series)).toEqual([
      {
        seriesLabels: { service: 'api' },
        exemplars: [
          { timestamp: ms(1), value: 120, labels: { trace_id: 't1' } },
          { timestamp: ms(2), value: 80, labels: { trace_id: 't2' } },
        ],
      },
      { seriesLabels: { service: 'web' }, exemplars: [{ timestamp: ms(1), value: 15, labels: { trace_id: 't3' } }] },
    ]);
  });

  it('attaches the exemplars to the first value column of a query returning several', () => {
    // Charts match exemplars and series on all their labels: the name of the value column is one of them.
    const built = buildTimeSeries(
      stubResponse(
        [TIME, ['service', 'String'], ['p50', 'Float64'], ['p95', 'Float64']],
        [
          [at(1), 'api', 10, 90],
          [at(1), 'web', 5, 20],
        ],
      ),
      options,
    );

    expect(buildExemplars(EXEMPLARS, built.series).map((group) => group.seriesLabels)).toEqual([
      { __name__: 'p50', service: 'api' },
      { __name__: 'p50', service: 'web' },
    ]);
  });

  it('needs a time and a value', () => {
    expect(() => buildExemplars(stubResponse([['trace_id', 'String']], [['t1']]), [])).toThrow(
      /must return a time column and a numeric "value" column/,
    );
  });
});
