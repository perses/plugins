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
import type { DatasourceSpec, TimeSeriesData } from '@perses-dev/spec';
import type { Mock } from 'vitest';

import type { ClickHouseDatasourceSpec } from '../../datasources';
import { ClickHouseDatasource } from '../../datasources';
import type { ClickHouseQueryResponse } from '../../model/click-house-client';
import { ClickHouseTimeSeriesQuery } from './ClickHouseQuery';

const datasource: ClickHouseDatasourceSpec = {
  directUrl: '/test',
};

const clickhouseStubClient = ClickHouseDatasource.createClient(datasource, {});

// Mock query to only return ClickHouse "data"
clickhouseStubClient.query = vi.fn(async () => {
  const stubResponse: ClickHouseQueryResponse = {
    status: 'success',
    data: [
      { time: '2025-09-09 05:18:00', avg_cpu: '2.5', max_memory: 277 },
      { time: '2025-09-09 05:19:00', avg_cpu: '3.5', max_memory: 156102 },
    ],
  };
  return stubResponse as ClickHouseQueryResponse;
});

const getDatasourceClient: Mock = vi.fn(() => {
  return clickhouseStubClient;
});

const getDatasource: Mock = vi.fn((): DatasourceSpec<ClickHouseDatasourceSpec> => {
  return {
    default: false,
    plugin: {
      kind: 'ClickHouseDatasource',
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

describe('ClickHouseTimeSeriesQuery', () => {
  it('should properly resolve variable dependencies', () => {
    if (!ClickHouseTimeSeriesQuery.dependsOn) throw new Error('dependsOn is not defined');
    const { variables } = ClickHouseTimeSeriesQuery.dependsOn(
      {
        query: '"SELECT * FROM otel_logs WHERE foo="$foo" AND bar="$bar"',
      },
      createStubContext(),
    );
    expect(variables).toEqual(['foo', 'bar']);
  });

  it('should create initial options with empty query', () => {
    const initialOptions = ClickHouseTimeSeriesQuery.createInitialOptions();
    expect(initialOptions).toEqual({ query: '' });
  });

  it('should run query with interpolated time range and return one series per numeric column', async () => {
    const response = await ClickHouseTimeSeriesQuery.getTimeSeriesData(
      {
        query:
          "SELECT toStartOfMinute(timestamp) as time, avg(cpu_usage) as avg_cpu, max(memory_usage) as max_memory FROM system_metrics WHERE timestamp BETWEEN '{start}' AND '{end}' GROUP BY time ORDER BY time",
      },
      createStubContext(),
    );

    expect(clickhouseStubClient.query).toHaveBeenCalledWith({
      start: '2025-01-01 00:00:00',
      end: '2025-01-02 00:00:00',
      query:
        "SELECT toStartOfMinute(timestamp) as time, avg(cpu_usage) as avg_cpu, max(memory_usage) as max_memory FROM system_metrics WHERE timestamp BETWEEN '2025-01-01 00:00:00' AND '2025-01-02 00:00:00' GROUP BY time ORDER BY time",
    });
    expect(response.series).toEqual([
      {
        name: 'avg_cpu',
        values: [
          [new Date('2025-09-09 05:18:00').getTime(), 2.5],
          [new Date('2025-09-09 05:19:00').getTime(), 3.5],
        ],
      },
      {
        name: 'max_memory',
        values: [
          [new Date('2025-09-09 05:18:00').getTime(), 277],
          [new Date('2025-09-09 05:19:00').getTime(), 156102],
        ],
      },
    ]);
    expect(response.stepMs).toBe(60 * 1000);
    expect(response.metadata?.executedQueryString).toBe(
      "SELECT toStartOfMinute(timestamp) as time, avg(cpu_usage) as avg_cpu, max(memory_usage) as max_memory FROM system_metrics WHERE timestamp BETWEEN '2025-01-01 00:00:00' AND '2025-01-02 00:00:00' GROUP BY time ORDER BY time",
    );
  });

  it('should infer daily query step from returned timestamps', async () => {
    (clickhouseStubClient.query as Mock).mockResolvedValueOnce({
      status: 'success',
      data: [
        { time: '2026-01-01 22:00:00', flights: 80 },
        { time: '2026-01-02 22:00:00', flights: 56 },
        { time: '2026-01-03 22:00:00', flights: 32 },
      ],
    });

    const response = await ClickHouseTimeSeriesQuery.getTimeSeriesData(
      {
        query:
          "SELECT toStartOfDay(timestamp) as time, sum(flights_count) as flights FROM flight WHERE timestamp BETWEEN '{start}' AND '{end}' GROUP BY time ORDER BY time",
      },
      createStubContext(),
    );

    expect(response.stepMs).toBe(24 * 60 * 60 * 1000);
    expect(response.series).toEqual([
      {
        name: 'flights',
        values: [
          [new Date('2026-01-01 22:00:00').getTime(), 80],
          [new Date('2026-01-02 22:00:00').getTime(), 56],
          [new Date('2026-01-03 22:00:00').getTime(), 32],
        ],
      },
    ]);
  });

  it('should keep timezone daily buckets daily across daylight saving time changes', async () => {
    (clickhouseStubClient.query as Mock).mockResolvedValueOnce({
      status: 'success',
      data: [
        { time: '2026-03-28 22:00:00', flights: 80 },
        { time: '2026-03-29 21:00:00', flights: 56 },
        { time: '2026-03-30 21:00:00', flights: 32 },
      ],
    });

    const response = await ClickHouseTimeSeriesQuery.getTimeSeriesData(
      {
        query:
          "SELECT toStartOfDay(timestamp) as time, sum(flights_count) as flights FROM flight WHERE timestamp BETWEEN '{start}' AND '{end}' GROUP BY time ORDER BY time",
      },
      createStubContext(),
    );

    expect(response.stepMs).toBe(24 * 60 * 60 * 1000);
  });

  describe('label columns', () => {
    const run = async (
      data: Array<Record<string, string | number | null>>,
      query = 'SELECT 1',
    ): Promise<TimeSeriesData> => {
      (clickhouseStubClient.query as Mock).mockResolvedValueOnce({
        status: 'success',
        data,
      });
      return ClickHouseTimeSeriesQuery.getTimeSeriesData({ query }, createStubContext());
    };
    const t1 = new Date('2026-01-01 00:00:00').getTime();
    const t2 = new Date('2026-01-01 00:01:00').getTime();

    it('should keep one series per value column, without labels, when no column is a label', async () => {
      const response = await run([
        { time: '2026-01-01 00:00:00', a: 1, b: '2' },
        { time: '2026-01-01 00:01:00', a: 3, b: null },
      ]);
      expect(response.series).toStrictEqual([
        {
          name: 'a',
          values: [
            [t1, 1],
            [t2, 3],
          ],
        },
        {
          name: 'b',
          values: [
            [t1, 2],
            [t2, null],
          ],
        },
      ]);
    });

    it('should split value columns into one series per label tuple', async () => {
      const response = await run([
        { time: '2026-01-01 00:00:00', repository: 'network-api', jobs: 4 },
        { time: '2026-01-01 00:00:00', repository: 'billing', jobs: 7 },
        { time: '2026-01-01 00:01:00', repository: 'network-api', jobs: 5 },
        { time: '2026-01-01 00:01:00', repository: 'billing', jobs: 9 },
      ]);
      expect(response.series).toStrictEqual([
        {
          name: 'jobs{repository="network-api"}',
          labels: { repository: 'network-api' },
          values: [
            [t1, 4],
            [t2, 5],
          ],
        },
        {
          name: 'jobs{repository="billing"}',
          labels: { repository: 'billing' },
          values: [
            [t1, 7],
            [t2, 9],
          ],
        },
      ]);
    });

    it('should combine several label columns and several value columns', async () => {
      const response = await run([
        {
          time: '2026-01-01 00:00:00',
          repository: 'api',
          branch: 'main',
          jobs: 1,
          failures: 0,
        },
      ]);
      expect(response.series?.map((s) => [s.name, s.labels])).toStrictEqual([
        ['jobs{branch="main",repository="api"}', { repository: 'api', branch: 'main' }],
        ['failures{branch="main",repository="api"}', { repository: 'api', branch: 'main' }],
      ]);
    });

    it('should treat a column mixing numbers and text as a value column', async () => {
      const response = await run([
        { time: '2026-01-01 00:00:00', repository: 'api', jobs: 1 },
        { time: '2026-01-01 00:01:00', repository: '5', jobs: 2 },
      ]);
      expect(response.series?.map((s) => s.name)).toStrictEqual(['repository', 'jobs']);
    });

    it('should keep labels on rows without a time column so tables can show them', async () => {
      const response = await run([
        { repository: 'network-api', coverage: 81.5 },
        { repository: 'billing', coverage: 64 },
      ]);
      expect(response.series).toStrictEqual([
        {
          name: 'coverage{repository="network-api"}',
          labels: { repository: 'network-api' },
          values: [[NaN, 81.5]],
        },
        {
          name: 'coverage{repository="billing"}',
          labels: { repository: 'billing' },
          values: [[NaN, 64]],
        },
      ]);
    });
  });
});
