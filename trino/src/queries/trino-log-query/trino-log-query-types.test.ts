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

import type { LogQueryContext } from '@perses-dev/plugin-system';
import type { Mock } from 'vitest';

import type { TrinoDatasourceSpec } from '../../datasources/trino-datasource';
import { TrinoDatasource } from '../../datasources/trino-datasource';
import type { TrinoQueryResponse } from '../../model/trino-client';
import { TrinoLogQuery } from './TrinoLogQuery';

const datasource: TrinoDatasourceSpec = {
  directUrl: '/test',
};

const trinoStubClient = TrinoDatasource.createClient(datasource, {});

// Mock query
trinoStubClient.query = vi.fn(async () => {
  const stubResponse: TrinoQueryResponse = {
    status: 'success',
    data: [],
  };
  return stubResponse as TrinoQueryResponse;
});

const getDatasourceClient: Mock = vi.fn(() => {
  return trinoStubClient;
});

const createStubContext = (): LogQueryContext => {
  const stubLogContext: LogQueryContext = {
    datasourceStore: {
      getDatasource: vi.fn(),
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
    refreshKey: '',
  };
  return stubLogContext;
};

describe('TrinoLogQuery', () => {
  it('should properly resolve variable dependencies', () => {
    if (!TrinoLogQuery.dependsOn) throw new Error('dependsOn is not defined');
    const { variables } = TrinoLogQuery.dependsOn(
      {
        query: '"SELECT * FROM otel_logs WHERE foo="$foo" AND bar="$bar"',
      },
      createStubContext(),
    );
    expect(variables).toEqual(['foo', 'bar']);
  });

  it('should create initial options with empty query', () => {
    const initialOptions = TrinoLogQuery.createInitialOptions();
    expect(initialOptions).toEqual({ query: '' });
  });

  it('should run query with interpolated time range', async () => {
    const response = await TrinoLogQuery.getLogData(
      {
        query:
          "SELECT * FROM application_logs WHERE event_time >= TIMESTAMP '{start}' AND event_time <= TIMESTAMP '{end}'",
      },
      createStubContext(),
    );

    expect(trinoStubClient.query).toHaveBeenCalledWith({
      start: '2025-01-01 00:00:00',
      end: '2025-01-02 00:00:00',
      query:
        "SELECT * FROM application_logs WHERE event_time >= TIMESTAMP '2025-01-01 00:00:00' AND event_time <= TIMESTAMP '2025-01-02 00:00:00'",
    });
    expect(response.metadata?.executedQueryString).toBe(
      "SELECT * FROM application_logs WHERE event_time >= TIMESTAMP '2025-01-01 00:00:00' AND event_time <= TIMESTAMP '2025-01-02 00:00:00'",
    );
  });

  it('converts rows to log entries using a case-insensitive time column', async () => {
    (trinoStubClient.query as Mock).mockResolvedValueOnce({
      status: 'success',
      data: [
        {
          Event_Time: 'ignored',
          TIMESTAMP: '2025-01-01 00:00:01.500',
          message: 'hello',
          attrs: { host: 'a' },
          tag: '',
        },
      ],
    });

    const response = await TrinoLogQuery.getLogData({ query: 'SELECT 1' }, createStubContext());

    expect(response.logs.entries).toEqual([
      {
        timestamp: Date.parse('2025-01-01T00:00:01.500Z') / 1000,
        labels: {
          'attrs.host': 'a',
          Event_Time: 'ignored',
          message: 'hello',
          tag: '--',
          TIMESTAMP: '2025-01-01 00:00:01.500',
        },
        line: '<attrs.host> a <Event_Time> ignored <message> hello <tag> --',
      },
    ]);
    expect(response.logs.metadata).toBeUndefined();
  });

  it('skips rows without a parseable time and warns instead of returning invalid entries', async () => {
    (trinoStubClient.query as Mock).mockResolvedValueOnce({
      status: 'success',
      truncated: true,
      data: [
        { log_time: '2025-01-01 00:00:00', message: 'kept' },
        { log_time: null, message: 'dropped' },
      ],
    });

    const response = await TrinoLogQuery.getLogData({ query: 'SELECT 1' }, createStubContext());

    expect(response.logs.entries.map((entry) => entry.labels['message'])).toEqual(['kept']);
    expect(response.logs.metadata?.notices).toHaveLength(2);
  });

  it('returns no entries and a warning when no time column exists', async () => {
    (trinoStubClient.query as Mock).mockResolvedValueOnce({
      status: 'success',
      data: [{ event_time: '2025-01-01 00:00:00', message: 'x' }],
    });

    const response = await TrinoLogQuery.getLogData({ query: 'SELECT 1' }, createStubContext());

    expect(response.logs.entries).toEqual([]);
    expect(response.logs.metadata?.notices?.[0]?.message).toContain('no parseable time column');
  });

  it('passes query context fields and the abort signal to the client', async () => {
    const controller = new AbortController();
    await TrinoLogQuery.getLogData(
      { query: 'SELECT 1', catalog: 'iceberg', schema: 'logs', routingGroup: 'adhoc' },
      createStubContext(),
      controller.signal,
    );

    expect(trinoStubClient.query).toHaveBeenLastCalledWith(
      expect.objectContaining({ catalog: 'iceberg', schema: 'logs', routingGroup: 'adhoc', signal: controller.signal }),
    );
  });
});
