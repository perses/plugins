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
          "SELECT toStartOfMinute(timestamp) as time, avg(cpu_usage) as avg_cpu, max(memory_usage) as max_memory FROM system_metrics WHERE timestamp BETWEEN '{start}' AND '{end}' GROUP BY time ORDER BY time",
      },
      createStubContext(),
    );

    expect(trinoStubClient.query).toHaveBeenCalledWith({
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
          "SELECT toStartOfDay(timestamp) as time, sum(flights_count) as flights FROM flight WHERE timestamp BETWEEN '{start}' AND '{end}' GROUP BY time ORDER BY time",
      },
      createStubContext(),
    );

    expect(response.stepMs).toBe(24 * 60 * 60 * 1000);
  });
});
