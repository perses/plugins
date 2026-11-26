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

import type { TimeSeriesQueryContext } from '@perses-dev/plugin-system';

import { ClickHouseError } from '../../model/click-house-client';
import type { StubClient } from '../../test/stubs';
import { stubClient, stubDatasourceStore, stubResponse } from '../../test/stubs';
import { ClickHouseTimeSeriesQuery } from './ClickHouseQuery';

function createContext(client: StubClient, overrides: Partial<TimeSeriesQueryContext> = {}): TimeSeriesQueryContext {
  return {
    datasourceStore: stubDatasourceStore(client),
    timeRange: {
      start: new Date('2025-01-01T00:00:00.000Z'),
      end: new Date('2025-01-02T00:00:00.000Z'),
    },
    variableState: {},
    ...overrides,
  } as TimeSeriesQueryContext;
}

const SERIES = stubResponse(
  [
    ['time', "DateTime('UTC')"],
    ['avg_cpu', 'Float64'],
  ],
  [
    ['2025-01-01T05:18:00Z', 2.5],
    ['2025-01-01T05:19:00Z', 3.5],
  ],
);

describe('ClickHouseTimeSeriesQuery', () => {
  it('should properly resolve variable dependencies', () => {
    if (!ClickHouseTimeSeriesQuery.dependsOn) throw new Error('dependsOn is not defined');
    const { variables } = ClickHouseTimeSeriesQuery.dependsOn(
      {
        datasource: '$ds',
        query: 'SELECT * FROM otel_logs WHERE $__timeFilter(Timestamp) AND foo="$foo" AND bar="$bar"',
        exemplarQuery: 'SELECT * FROM otel_traces WHERE service = ${service:sqlstring}',
        seriesNameFormat: '{{service}} $env',
        minStep: '$resolution',
      },
      createContext(stubClient(() => SERIES)),
    );
    expect(variables).toEqual(['ds', 'foo', 'bar', 'service', 'env', 'resolution']);
  });

  it('should create initial options with empty query', () => {
    const initialOptions = ClickHouseTimeSeriesQuery.createInitialOptions();
    expect(initialOptions).toEqual({ query: '' });
  });

  it('should run the query with its macros, time range placeholders and variables replaced', async () => {
    const client = stubClient(() => SERIES);

    const response = await ClickHouseTimeSeriesQuery.getTimeSeriesData(
      {
        query:
          "SELECT $__timeInterval(timestamp) AS time, avg(cpu) AS avg_cpu FROM metrics WHERE timestamp BETWEEN '{start}' AND '{end}' AND host IN (${host:sqlstring}) GROUP BY time",
        seriesNameFormat: 'CPU of $env',
      },
      createContext(client, {
        suggestedStepMs: 50_000,
        variableState: {
          host: { value: ['a', 'b'], loading: false },
          env: { value: 'prod', loading: false },
        },
      }),
    );

    const executed =
      "SELECT toStartOfInterval(toDateTime(timestamp), INTERVAL 60 second) AS time, avg(cpu) AS avg_cpu FROM metrics WHERE timestamp BETWEEN '2025-01-01 00:00:00' AND '2025-01-02 00:00:00' AND host IN ('a','b') GROUP BY time";
    expect(client.statements()).toEqual([executed]);
    expect(response.metadata?.executedQueryString).toBe(executed);
    expect(response.series).toEqual([
      {
        name: 'avg_cpu',
        formattedName: 'CPU of prod',
        labels: {},
        values: [
          [Date.UTC(2025, 0, 1, 5, 18), 2.5],
          [Date.UTC(2025, 0, 1, 5, 19), 3.5],
        ],
      },
    ]);
    expect(response.stepMs).toBe(60 * 1000);
    // The time grid of the points, which charts draw on, starts at the time range.
    expect(response.timeRange).toEqual({
      start: new Date('2025-01-01T00:00:00.000Z'),
      end: new Date('2025-01-02T00:00:00.000Z'),
    });
  });

  it.each([
    // The panel asks for a point every 5 seconds: the min step, when longer, is the interval of the macros.
    { minStep: '1m', interval: 60 },
    { minStep: '$resolution', interval: 120 },
    // The shortest interval is one second: a min step is rounded up to the second.
    { minStep: '5500ms', interval: 6 },
    { minStep: '2s', interval: 5 },
    { minStep: '$unset', interval: 5 },
    { minStep: undefined, interval: 5 },
  ])('should not use an interval shorter than the min step $minStep', async ({ minStep, interval }) => {
    const client = stubClient(() => SERIES);

    await ClickHouseTimeSeriesQuery.getTimeSeriesData(
      {
        query: 'SELECT $__timeInterval(t) AS time, count() / $__interval_s AS rate FROM events GROUP BY time',
        exemplarQuery: 'SELECT t AS time, $__interval_ms AS value FROM events',
        minStep,
      },
      createContext(client, {
        suggestedStepMs: 5_000,
        variableState: {
          resolution: { value: '2m', loading: false },
          unset: { value: '', loading: false },
        },
      }),
    );

    expect(client.statements()).toEqual([
      `SELECT toStartOfInterval(toDateTime(t), INTERVAL ${interval} second) AS time, count() / ${interval} AS rate FROM events GROUP BY time`,
      `SELECT t AS time, ${interval * 1000} AS value FROM events`,
    ]);
  });

  it('should size the interval on the time range until the panel knows its width', async () => {
    const client = stubClient(() => SERIES);

    await ClickHouseTimeSeriesQuery.getTimeSeriesData(
      { query: 'SELECT $__interval_s AS value' },
      createContext(client, { suggestedStepMs: 0 }),
    );

    // A day in about 300 intervals.
    expect(client.statements()).toEqual(['SELECT 300 AS value']);
  });

  it('should ignore the FORMAT clause queries used to end with', async () => {
    const client = stubClient(() => SERIES);

    await ClickHouseTimeSeriesQuery.getTimeSeriesData(
      { query: 'SELECT time, avg_cpu FROM metrics ORDER BY time FORMAT JSON' },
      createContext(client),
    );

    expect(client.statements()).toEqual(['SELECT time, avg_cpu FROM metrics ORDER BY time']);
  });

  it('should keep the longer interval a panel asks for', async () => {
    const client = stubClient(() => SERIES);

    await ClickHouseTimeSeriesQuery.getTimeSeriesData(
      { query: 'SELECT $__interval_s AS value', minStep: '1m' },
      createContext(client, { suggestedStepMs: 240_000 }),
    );

    expect(client.statements()).toEqual(['SELECT 300 AS value']);
  });

  it('should reject a min step that is not a duration', async () => {
    const client = stubClient(() => SERIES);
    const context = createContext(client, { variableState: { resolution: { value: 'fast', loading: false } } });

    await expect(
      ClickHouseTimeSeriesQuery.getTimeSeriesData({ query: 'SELECT 1 AS value', minStep: 'one minute' }, context),
    ).rejects.toThrow("Invalid Min Step 'one minute': expected a duration such as 30s or 5m");
    await expect(
      ClickHouseTimeSeriesQuery.getTimeSeriesData({ query: 'SELECT 1 AS value', minStep: '$resolution' }, context),
    ).rejects.toThrow("Invalid Min Step '$resolution' (resolved to 'fast'): expected a duration such as 30s or 5m");
    expect(client.statements()).toEqual([]);
  });

  it('should attach the exemplars of the exemplar query to the series', async () => {
    const client = stubClient((sql) =>
      sql.includes('otel_traces')
        ? stubResponse(
            [
              ['time', "DateTime('UTC')"],
              ['value', 'Float64'],
              ['trace_id', 'String'],
            ],
            [['2025-01-01T05:18:30Z', 9, 'abc']],
          )
        : SERIES,
    );

    const response = await ClickHouseTimeSeriesQuery.getTimeSeriesData(
      { query: 'SELECT time, avg_cpu FROM metrics', exemplarQuery: 'SELECT * FROM otel_traces' },
      createContext(client),
    );

    expect(response.exemplars).toEqual([
      {
        seriesLabels: {},
        exemplars: [{ timestamp: Date.UTC(2025, 0, 1, 5, 18, 30), value: 9, labels: { trace_id: 'abc' } }],
      },
    ]);
  });

  it('should still return the series when their exemplars can not be read', async () => {
    const client = stubClient((sql) => {
      if (sql.includes('otel_traces'))
        throw new ClickHouseError('ClickHouse query failed: Unknown table', { code: 60 });
      return SERIES;
    });

    const response = await ClickHouseTimeSeriesQuery.getTimeSeriesData(
      { query: 'SELECT time, avg_cpu FROM metrics', exemplarQuery: 'SELECT * FROM otel_traces' },
      createContext(client),
    );

    expect(response.series).toHaveLength(1);
    expect(response.exemplars).toBeUndefined();
    expect(response.metadata?.notices).toEqual([
      { type: 'warning', message: 'Exemplars are not shown. ClickHouse query failed: Unknown table' },
    ]);
  });

  it('should not run an empty query', async () => {
    const client = stubClient(() => SERIES);

    await expect(ClickHouseTimeSeriesQuery.getTimeSeriesData({ query: '  ' }, createContext(client))).resolves.toEqual({
      series: [],
    });
    expect(client.statements()).toEqual([]);
  });
});
