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

// TODO: This should be fixed globally in the test setup

vi.mock('echarts/core');

import type { TimeSeriesQueryContext } from '@perses-dev/plugin-system';
import type { DatasourceSpec } from '@perses-dev/spec';
import type { Mock } from 'vitest';

import type { TrinoDatasourceSpec } from '../../datasources';
import { TrinoDatasource } from '../../datasources';
import type { TrinoQueryResponse } from '../../model/trino-client';
import { MAX_SERIES } from './get-trino-data';
import { TrinoTimeSeriesQuery } from './TrinoQuery';

const datasource: TrinoDatasourceSpec = {
  directUrl: '/test',
};

const trinoStubClient = TrinoDatasource.createClient(datasource, {});

// Mock query to only return Trino "data"
trinoStubClient.query = vi.fn(async () => {
  const stubResponse: TrinoQueryResponse = {
    status: 'success',
    data: [
      { time: '2025-09-09 05:18:00', avg_cpu: '2.5', max_memory: 277, service: 'api' },
      { time: '2025-09-09 05:19:00', avg_cpu: '3.5', max_memory: 156102, service: 'api' },
    ],
  };
  return stubResponse as TrinoQueryResponse;
});

const getDatasourceClient: Mock = vi.fn(() => {
  return trinoStubClient;
});

const getDatasource: Mock = vi.fn((): DatasourceSpec<TrinoDatasourceSpec> => {
  return {
    default: false,
    plugin: {
      kind: 'TrinoDatasource',
      spec: datasource,
    },
  };
});

const createStubContext = (): TimeSeriesQueryContext => {
  const stubTimeSeriesContext: Partial<TimeSeriesQueryContext> = {
    datasourceStore: {
      getDatasource: getDatasource,
      getDatasourceClient: getDatasourceClient,
      listDatasourceSelectItems: vi.fn(),
      getLocalDatasources: vi.fn(),
      setLocalDatasources: vi.fn(),
      getSavedDatasources: vi.fn(),
      setSavedDatasources: vi.fn(),
    },
    timeRange: {
      end: new Date('2025-01-02T00:00:00.000Z'),
      start: new Date('2025-01-01T00:00:00.000Z'),
    },
    variableState: {},
  };
  return stubTimeSeriesContext as TimeSeriesQueryContext;
};

const runWithColumns = async (
  columns: Array<{ name: string; type: string }> | undefined,
  data: Array<Record<string, unknown>>,
): Promise<Awaited<ReturnType<typeof TrinoTimeSeriesQuery.getTimeSeriesData>>> => {
  (trinoStubClient.query as Mock).mockResolvedValueOnce({ status: 'success', data, columns });
  return TrinoTimeSeriesQuery.getTimeSeriesData({ query: 'SELECT 1' }, createStubContext());
};

describe('TrinoTimeSeriesQuery', () => {
  it('should properly resolve variable dependencies', () => {
    if (!TrinoTimeSeriesQuery.dependsOn) throw new Error('dependsOn is not defined');
    const { variables } = TrinoTimeSeriesQuery.dependsOn(
      {
        query: '"SELECT * FROM otel_logs WHERE foo="$foo" AND bar="$bar"',
      },
      createStubContext(),
    );
    expect(variables).toEqual(['foo', 'bar']);
  });

  it('should create initial options with empty query', () => {
    const initialOptions = TrinoTimeSeriesQuery.createInitialOptions();
    expect(initialOptions).toEqual({ query: '' });
  });

  it('should run query with interpolated time range and return one series per numeric column', async () => {
    const response = await TrinoTimeSeriesQuery.getTimeSeriesData(
      {
        query:
          "SELECT date_trunc('minute', event_time) as time, avg(cpu_usage) as avg_cpu, max(memory_usage) as max_memory FROM system_metrics WHERE event_time BETWEEN TIMESTAMP '{start}' AND TIMESTAMP '{end}' GROUP BY 1 ORDER BY 1",
      },
      createStubContext(),
    );

    expect(trinoStubClient.query).toHaveBeenCalledWith({
      start: '2025-01-01 00:00:00',
      end: '2025-01-02 00:00:00',
      query:
        "SELECT date_trunc('minute', event_time) as time, avg(cpu_usage) as avg_cpu, max(memory_usage) as max_memory FROM system_metrics WHERE event_time BETWEEN TIMESTAMP '2025-01-01 00:00:00' AND TIMESTAMP '2025-01-02 00:00:00' GROUP BY 1 ORDER BY 1",
    });
    expect(response.series).toEqual([
      {
        name: 'avg_cpu',
        values: [
          [Date.parse('2025-09-09T05:18:00Z'), 2.5],
          [Date.parse('2025-09-09T05:19:00Z'), 3.5],
        ],
      },
      {
        name: 'max_memory',
        values: [
          [Date.parse('2025-09-09T05:18:00Z'), 277],
          [Date.parse('2025-09-09T05:19:00Z'), 156102],
        ],
      },
    ]);
    expect(response.stepMs).toBe(60 * 1000);
    expect(response.metadata?.executedQueryString).toBe(
      "SELECT date_trunc('minute', event_time) as time, avg(cpu_usage) as avg_cpu, max(memory_usage) as max_memory FROM system_metrics WHERE event_time BETWEEN TIMESTAMP '2025-01-01 00:00:00' AND TIMESTAMP '2025-01-02 00:00:00' GROUP BY 1 ORDER BY 1",
    );
  });

  it('should infer daily query step from returned timestamps', async () => {
    (trinoStubClient.query as Mock).mockResolvedValueOnce({
      status: 'success',
      data: [
        { time: '2026-01-01 22:00:00', flights: 80 },
        { time: '2026-01-02 22:00:00', flights: 56 },
        { time: '2026-01-03 22:00:00', flights: 32 },
      ],
    });

    const response = await TrinoTimeSeriesQuery.getTimeSeriesData(
      {
        query:
          "SELECT date_trunc('day', event_time) as time, sum(flights_count) as flights FROM flight WHERE event_time BETWEEN TIMESTAMP '{start}' AND TIMESTAMP '{end}' GROUP BY 1 ORDER BY 1",
      },
      createStubContext(),
    );

    expect(response.stepMs).toBe(24 * 60 * 60 * 1000);
    expect(response.series).toEqual([
      {
        name: 'flights',
        values: [
          [Date.parse('2026-01-01T22:00:00Z'), 80],
          [Date.parse('2026-01-02T22:00:00Z'), 56],
          [Date.parse('2026-01-03T22:00:00Z'), 32],
        ],
      },
    ]);
  });

  it('should keep timezone daily buckets daily across daylight saving time changes', async () => {
    (trinoStubClient.query as Mock).mockResolvedValueOnce({
      status: 'success',
      data: [
        { time: '2026-03-28 22:00:00', flights: 80 },
        { time: '2026-03-29 21:00:00', flights: 56 },
        { time: '2026-03-30 21:00:00', flights: 32 },
      ],
    });

    const response = await TrinoTimeSeriesQuery.getTimeSeriesData(
      {
        query:
          "SELECT date_trunc('day', event_time) as time, sum(flights_count) as flights FROM flight WHERE event_time BETWEEN TIMESTAMP '{start}' AND TIMESTAMP '{end}' GROUP BY 1 ORDER BY 1",
      },
      createStubContext(),
    );

    expect(response.stepMs).toBe(24 * 60 * 60 * 1000);
  });

  describe('long format', () => {
    const t1 = Date.parse('2025-09-09T05:18:00Z');
    const t2 = Date.parse('2025-09-09T05:19:00Z');

    it('splits one value column into a series per label value', async () => {
      const response = await runWithColumns(
        [
          { name: 'time', type: 'timestamp(3)' },
          { name: 'host', type: 'varchar' },
          { name: 'value', type: 'double' },
        ],
        [
          { time: '2025-09-09 05:18:00', host: 'a', value: 1 },
          { time: '2025-09-09 05:18:00', host: 'b', value: 2 },
          { time: '2025-09-09 05:19:00', host: 'a', value: 3 },
          { time: '2025-09-09 05:19:00', host: 'b', value: 4 },
        ],
      );

      expect(response.series).toEqual([
        {
          name: '{host="a"}',
          labels: { host: 'a' },
          values: [
            [t1, 1],
            [t2, 3],
          ],
        },
        {
          name: '{host="b"}',
          labels: { host: 'b' },
          values: [
            [t1, 2],
            [t2, 4],
          ],
        },
      ]);
    });

    it('groups by several label columns', async () => {
      const response = await runWithColumns(
        [
          { name: 'time', type: 'timestamp(3)' },
          { name: 'host', type: 'varchar' },
          { name: 'region', type: 'varchar' },
          { name: 'value', type: 'bigint' },
        ],
        [
          { time: '2025-09-09 05:18:00', host: 'a', region: 'eu', value: 1 },
          { time: '2025-09-09 05:18:00', host: 'a', region: 'us', value: 2 },
        ],
      );

      expect(response.series).toEqual([
        { name: '{host="a", region="eu"}', labels: { host: 'a', region: 'eu' }, values: [[t1, 1]] },
        { name: '{host="a", region="us"}', labels: { host: 'a', region: 'us' }, values: [[t1, 2]] },
      ]);
    });

    it('prefixes the value column name when there are several value columns', async () => {
      const response = await runWithColumns(
        [
          { name: 'time', type: 'timestamp(3)' },
          { name: 'host', type: 'varchar' },
          { name: 'avg_cpu', type: 'double' },
          { name: 'max_memory', type: 'integer' },
        ],
        [
          { time: '2025-09-09 05:18:00', host: 'a', avg_cpu: 1.5, max_memory: 10 },
          { time: '2025-09-09 05:18:00', host: 'b', avg_cpu: 2.5, max_memory: 20 },
        ],
      );

      expect(response.series.map((series) => series.name)).toEqual([
        'avg_cpu{host="a"}',
        'avg_cpu{host="b"}',
        'max_memory{host="a"}',
        'max_memory{host="b"}',
      ]);
      expect(response.series[3]).toEqual({
        name: 'max_memory{host="b"}',
        labels: { __name__: 'max_memory', host: 'b' },
        values: [[t1, 20]],
      });
    });

    it('uses an empty label value for null and escapes quotes in the name', async () => {
      const response = await runWithColumns(
        [
          { name: 'time', type: 'timestamp(3)' },
          { name: 'host', type: 'varchar' },
          { name: 'value', type: 'double' },
        ],
        [
          { time: '2025-09-09 05:18:00', host: null, value: 1 },
          { time: '2025-09-09 05:18:00', host: 'say "hi"', value: 2 },
        ],
      );

      expect(response.series).toEqual([
        { name: '{host=""}', labels: { host: '' }, values: [[t1, 1]] },
        { name: '{host="say \\"hi\\""}', labels: { host: 'say "hi"' }, values: [[t1, 2]] },
      ]);
    });

    it('keeps a varchar column of digits as a label and reads decimal strings as values', async () => {
      const response = await runWithColumns(
        [
          { name: 'time', type: 'timestamp(3)' },
          { name: 'code', type: 'varchar' },
          { name: 'value', type: 'decimal(10,2)' },
        ],
        [{ time: '2025-09-09 05:18:00', code: '404', value: '1.50' }],
      );

      expect(response.series).toEqual([{ name: '{code="404"}', labels: { code: '404' }, values: [[t1, 1.5]] }]);
    });

    it.each(['tinyint', 'smallint', 'integer', 'bigint', 'real', 'double', 'number', 'decimal(10,2)'])(
      'treats %s as a value column',
      async (type) => {
        const response = await runWithColumns(
          [
            { name: 'time', type: 'timestamp(3)' },
            { name: 'host', type: 'varchar' },
            { name: 'value', type },
          ],
          [{ time: '2025-09-09 05:18:00', host: 'a', value: '2' }],
        );

        expect(response.series).toEqual([{ name: '{host="a"}', labels: { host: 'a' }, values: [[t1, 2]] }]);
        expect(response.metadata?.notices).toBeUndefined();
      },
    );

    it.each([
      ['a varchar value column', [{ name: 'value', type: 'varchar' }], { value: '2' }],
      ['only a time column', [], {}],
    ])('warns when typed columns include no numeric column (%s)', async (_, extraColumns, extraValues) => {
      const response = await runWithColumns(
        [{ name: 'time', type: 'timestamp(3)' }, ...extraColumns],
        [{ time: '2025-09-09 05:18:00', ...extraValues }],
      );

      expect(response.series).toEqual([]);
      expect(response.metadata?.notices).toEqual([
        { type: 'warning', message: 'No numeric columns: cast value columns to a number type such as double.' },
      ]);
    });

    it('does not warn about numeric columns when there are no rows', async () => {
      const response = await runWithColumns(
        [
          { name: 'time', type: 'timestamp(3)' },
          { name: 'value', type: 'varchar' },
        ],
        [],
      );

      expect(response.metadata?.notices).toBeUndefined();
    });

    it('keeps labels that contain the key delimiter in separate series', async () => {
      const response = await runWithColumns(
        [
          { name: 'time', type: 'timestamp(3)' },
          { name: 'host', type: 'varchar' },
          { name: 'region', type: 'varchar' },
          { name: 'value', type: 'double' },
        ],
        [
          { time: '2025-09-09 05:18:00', host: 'a,b', region: 'c', value: 1 },
          { time: '2025-09-09 05:18:00', host: 'a', region: 'b,c', value: 2 },
        ],
      );

      expect(response.series.map((series) => series.labels)).toEqual([
        { host: 'a', region: 'b,c' },
        { host: 'a,b', region: 'c' },
      ]);
    });

    it('merges null and empty-string labels into one series', async () => {
      const response = await runWithColumns(
        [
          { name: 'time', type: 'timestamp(3)' },
          { name: 'host', type: 'varchar' },
          { name: 'value', type: 'double' },
        ],
        [
          { time: '2025-09-09 05:18:00', host: null, value: 1 },
          { time: '2025-09-09 05:18:00', host: '', value: 2 },
        ],
      );

      expect(response.series).toEqual([
        {
          name: '{host=""}',
          labels: { host: '' },
          values: [
            [t1, 1],
            [t1, 2],
          ],
        },
      ]);
    });

    it('serializes object label values as JSON so distinct values stay apart', async () => {
      const response = await runWithColumns(
        [
          { name: 'time', type: 'timestamp(3)' },
          { name: 'tags', type: 'map(varchar, varchar)' },
          { name: 'value', type: 'double' },
        ],
        [
          { time: '2025-09-09 05:18:00', tags: { env: 'prod' }, value: 1 },
          { time: '2025-09-09 05:18:00', tags: { env: 'dev' }, value: 2 },
        ],
      );

      expect(response.series.map((series) => series.labels)).toEqual([
        { tags: '{"env":"dev"}' },
        { tags: '{"env":"prod"}' },
      ]);
    });

    it('keeps the series order when rows tied on time come back swapped', async () => {
      const columns = [
        { name: 'time', type: 'timestamp(3)' },
        { name: 'host', type: 'varchar' },
        { name: 'value', type: 'double' },
      ];
      const rowA = { time: '2025-09-09 05:18:00', host: 'a', value: 1 };
      const rowB = { time: '2025-09-09 05:18:00', host: 'b', value: 2 };

      const forward = await runWithColumns(columns, [rowA, rowB]);
      const swapped = await runWithColumns(columns, [rowB, rowA]);

      expect(swapped.series).toEqual(forward.series);
      expect(forward.series.map((series) => series.name)).toEqual(['{host="a"}', '{host="b"}']);
    });

    it('caps the number of series and warns', async () => {
      const response = await runWithColumns(
        [
          { name: 'time', type: 'timestamp(3)' },
          { name: 'request_id', type: 'varchar' },
          { name: 'value', type: 'double' },
        ],
        Array.from({ length: MAX_SERIES + 1 }, (_, i) => ({
          time: '2025-09-09 05:18:00',
          request_id: String(i).padStart(5, '0'),
          value: i,
        })),
      );

      expect(response.series).toHaveLength(MAX_SERIES);
      expect(response.series[0]?.labels).toEqual({ request_id: '00000' });
      expect(response.metadata?.notices).toEqual([
        {
          type: 'warning',
          message: `Results were split into ${MAX_SERIES + 1} series; only the first ${MAX_SERIES} are shown. Drop high-cardinality label columns or cast them to a number.`,
        },
      ]);
    });

    it('plots boolean columns as 0 and 1', async () => {
      const response = await runWithColumns(
        [
          { name: 'time', type: 'timestamp(3)' },
          { name: 'host', type: 'varchar' },
          { name: 'is_up', type: 'boolean' },
        ],
        [
          { time: '2025-09-09 05:18:00', host: 'a', is_up: true },
          { time: '2025-09-09 05:19:00', host: 'a', is_up: false },
        ],
      );

      expect(response.series).toEqual([
        {
          name: '{host="a"}',
          labels: { host: 'a' },
          values: [
            [t1, 1],
            [t2, 0],
          ],
        },
      ]);
      expect(response.metadata?.notices).toBeUndefined();
    });

    it('keeps the wide format when there are no label columns', async () => {
      const response = await runWithColumns(
        [
          { name: 'time', type: 'timestamp(3)' },
          { name: 'avg_cpu', type: 'double' },
          { name: 'max_memory', type: 'bigint' },
        ],
        [{ time: '2025-09-09 05:18:00', avg_cpu: 1.5, max_memory: 10 }],
      );

      expect(response.series).toEqual([
        { name: 'avg_cpu', values: [[t1, 1.5]] },
        { name: 'max_memory', values: [[t1, 10]] },
      ]);
    });

    it.each([undefined, []])('treats every non-time column as a value without column types (%j)', async (columns) => {
      const response = await runWithColumns(columns, [{ time: '2025-09-09 05:18:00', host: 'a', value: 1 }]);

      expect(response.series).toEqual([{ name: 'value', values: [[t1, 1]] }]);
    });
  });

  it('passes query context fields and the abort signal to the client', async () => {
    const controller = new AbortController();
    await TrinoTimeSeriesQuery.getTimeSeriesData(
      {
        query: 'SELECT 1',
        catalog: 'iceberg',
        schema: 'analytics',
        sessionProperties: 'query_max_run_time=5m',
        source: 'perses',
        routingGroup: 'etl',
      },
      createStubContext(),
      controller.signal,
    );

    expect(trinoStubClient.query).toHaveBeenLastCalledWith({
      start: '2025-01-01 00:00:00',
      end: '2025-01-02 00:00:00',
      query: 'SELECT 1',
      catalog: 'iceberg',
      schema: 'analytics',
      sessionProperties: 'query_max_run_time=5m',
      source: 'perses',
      routingGroup: 'etl',
      signal: controller.signal,
    });
  });

  it('reads zone-less timestamps as UTC whatever the browser time zone', async () => {
    const originalTz = process.env.TZ;
    process.env.TZ = 'America/New_York';
    try {
      const response = await TrinoTimeSeriesQuery.getTimeSeriesData({ query: 'SELECT 1' }, createStubContext());
      expect(response.series[0]?.values[0]?.[0]).toBe(Date.parse('2025-09-09T05:18:00Z'));
    } finally {
      process.env.TZ = originalTz;
    }
  });

  it('warns when results are truncated or rows have no parseable time', async () => {
    (trinoStubClient.query as Mock).mockResolvedValueOnce({
      status: 'success',
      truncated: true,
      data: [
        { time: '2025-09-09 05:18:00', value: 1 },
        { time: 'not a time', value: 2 },
      ],
    });

    const response = await TrinoTimeSeriesQuery.getTimeSeriesData({ query: 'SELECT 1' }, createStubContext());

    expect(response.series).toEqual([{ name: 'value', values: [[Date.parse('2025-09-09T05:18:00Z'), 1]] }]);
    expect(response.metadata?.notices?.map((notice) => notice.type)).toEqual(['warning', 'warning']);
    expect(response.metadata?.notices?.[0]?.message).toContain('truncated');
  });

  it('interpolates dashboard variables in the query context fields', async () => {
    const variableState = {
      cat: { value: 'iceberg', loading: false },
      tenant: { value: 'acme', loading: false },
    } as unknown as TimeSeriesQueryContext['variableState'];

    await TrinoTimeSeriesQuery.getTimeSeriesData(
      {
        query: 'SELECT 1',
        catalog: '$cat',
        schema: '${tenant}_logs',
        sessionProperties: 'tag=$tenant',
        source: 'perses-$tenant',
        routingGroup: '$tenant',
      },
      { ...createStubContext(), variableState },
    );

    expect(trinoStubClient.query).toHaveBeenLastCalledWith(
      expect.objectContaining({
        catalog: 'iceberg',
        schema: 'acme_logs',
        sessionProperties: 'tag=acme',
        source: 'perses-acme',
        routingGroup: 'acme',
      }),
    );
  });

  it('depends on variables used in the query context fields', () => {
    const { variables } = TrinoTimeSeriesQuery.dependsOn!(
      { query: 'SELECT $metric', catalog: '$cat', schema: '${tenant}', routingGroup: '$cat' },
      createStubContext(),
    );
    expect(variables?.toSorted()).toEqual(['cat', 'metric', 'tenant']);
  });
});
