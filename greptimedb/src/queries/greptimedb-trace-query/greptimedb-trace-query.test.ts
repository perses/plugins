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

import { DatasourceSpec } from '@perses-dev/core';
import { TraceQueryContext } from '@perses-dev/plugin-system';
import { GreptimeDBDatasource, GreptimeDBDatasourceSpec } from '../../datasources';
import { GreptimeDBQueryResponse } from '../../model/greptimedb-client';
import { GreptimeDBTraceQuery } from './GreptimeDBTraceQuery';

const datasource: GreptimeDBDatasourceSpec = {
  directUrl: '/test',
};

const greptimedbStubClient = GreptimeDBDatasource.createClient(datasource, {});
const mockedQuery = jest.fn();
greptimedbStubClient.query = mockedQuery;

const getDatasourceClient: jest.Mock = jest.fn(() => {
  return greptimedbStubClient;
});

const createStubContext = (variableState: TraceQueryContext['variableState'] = {}): TraceQueryContext => {
  const stubTraceContext: Partial<TraceQueryContext> = {
    datasourceStore: {
      getDatasource: jest.fn(async (): Promise<DatasourceSpec> => {
        return Promise.resolve({
          default: false,
          plugin: {
            kind: 'GreptimeDBDatasource',
            spec: datasource,
          },
        } as DatasourceSpec);
      }),
      getDatasourceClient: getDatasourceClient,
      listDatasourceSelectItems: jest.fn(),
      getLocalDatasources: jest.fn(),
      setLocalDatasources: jest.fn(),
      getSavedDatasources: jest.fn(),
      setSavedDatasources: jest.fn(),
    },
    variableState,
  };
  return stubTraceContext as TraceQueryContext;
};

describe('GreptimeDBTraceQuery', () => {
  beforeEach(() => {
    mockedQuery.mockReset();
    getDatasourceClient.mockClear();
  });

  it('should create initial options', () => {
    expect(GreptimeDBTraceQuery.createInitialOptions()).toEqual({
      query: '',
    });
  });

  it('should convert SQL rows into trace search results', async () => {
    const stubResponse: GreptimeDBQueryResponse = {
      status: 'success',
      data: {
        schema: {
          column_schemas: [
            { name: 'trace_id' },
            { name: 'timestamp', data_type: 'timestamp_millisecond' },
            { name: 'duration_ms' },
            { name: 'root_service_name' },
            { name: 'root_trace_name' },
            { name: 'status_code' },
          ],
        },
        rows: [
          ['abc123abc123abc123abc123abc123ab', 1700000000000, 100, 'frontend', 'GET /', 'STATUS_CODE_ERROR'],
        ],
      },
    };
    mockedQuery.mockResolvedValue(stubResponse);

    const result = await GreptimeDBTraceQuery.getTraceData(
      {
        query: 'SELECT * FROM public.opentelemetry_traces',
      },
      createStubContext()
    );

    expect(result.searchResult).toHaveLength(1);
    expect(result.searchResult?.[0]?.traceId).toBe('abc123abc123abc123abc123abc123ab');
    expect(result.searchResult?.[0]?.rootServiceName).toBe('frontend');
    expect(result.searchResult?.[0]?.durationMs).toBe(100);
    expect(result.searchResult?.[0]?.serviceStats?.frontend?.spanCount).toBe(1);
    expect(result.searchResult?.[0]?.serviceStats?.frontend?.errorCount).toBe(1);
    expect(result.trace).toBeUndefined();
  });

  it('should convert trace detail SQL rows into OTLP trace', async () => {
    const traceId = 'fb60d19aa36fdcb7d14a71ca0b9b42ae';
    const detailsQuery = `SELECT * FROM public.opentelemetry_traces WHERE trace_id = '${traceId}' ORDER BY timestamp ASC`;
    const stubResponse: GreptimeDBQueryResponse = {
      status: 'success',
      data: {
        schema: {
          column_schemas: [
            { name: 'trace_id' },
            { name: 'span_id' },
            { name: 'parent_span_id' },
            { name: 'timestamp', data_type: 'timestamp_millisecond' },
            { name: 'timestamp_end', data_type: 'timestamp_millisecond' },
            { name: 'service_name' },
            { name: 'scope_name' },
            { name: 'scope_version' },
            { name: 'span_name' },
            { name: 'span_kind' },
            { name: 'span_status_code' },
            { name: 'span_status_message' },
            { name: 'span_events' },
            { name: 'span_links' },
            { name: 'span_attributes.http.method' },
          ],
        },
        rows: [
          [
            traceId,
            'sid-root',
            null,
            1700000000000,
            1700000000100,
            'frontend',
            'otel.scope',
            '1.0.0',
            'GET /',
            'SPAN_KIND_SERVER',
            'STATUS_CODE_OK',
            '',
            '[]',
            '[]',
            'GET',
          ],
          [
            traceId,
            'sid-child',
            'sid-root',
            1700000000020,
            1700000000090,
            'frontend',
            'otel.scope',
            '1.0.0',
            'SELECT users',
            'SPAN_KIND_CLIENT',
            'STATUS_CODE_ERROR',
            'db error',
            '[{\"name\":\"exception\",\"time_unix_nano\":\"1700000000030000000\"}]',
            '[]',
            'POST',
          ],
        ],
      },
    };
    mockedQuery.mockResolvedValue(stubResponse);

    const result = await GreptimeDBTraceQuery.getTraceData(
      {
        query: detailsQuery,
      },
      createStubContext()
    );

    expect(mockedQuery).toHaveBeenCalledWith({
      query: detailsQuery,
      start: '0',
      end: '0',
    });
    expect(result.trace?.resourceSpans?.[0]?.scopeSpans?.[0]?.spans).toHaveLength(2);
    expect(result.trace?.resourceSpans?.[0]?.scopeSpans?.[0]?.spans?.[1]?.status?.code).toBe('STATUS_CODE_ERROR');
    expect(result.searchResult).toBeUndefined();
  });

  it('should normalize empty datasource name from deep-link payload', async () => {
    mockedQuery.mockResolvedValue({
      status: 'success',
      data: {
        schema: {
          column_schemas: [{ name: 'trace_id' }],
        },
        rows: [],
      },
    } as GreptimeDBQueryResponse);

    await GreptimeDBTraceQuery.getTraceData(
      {
        query: 'SELECT * FROM public.trace_spans',
        datasource: {
          kind: 'GreptimeDBDatasource',
          name: '',
        },
      },
      createStubContext()
    );

    expect(getDatasourceClient).toHaveBeenCalledWith({
      kind: 'GreptimeDBDatasource',
    });
  });

  it('should replace query variables from variableState', async () => {
    mockedQuery.mockResolvedValue({
      status: 'success',
      data: {
        schema: {
          column_schemas: [{ name: 'trace_id' }],
        },
        rows: [],
      },
    } as GreptimeDBQueryResponse);

    await GreptimeDBTraceQuery.getTraceData(
      {
        query: "SELECT * FROM public.web_trace_demo WHERE trace_id = '${trace_id}'",
      },
      createStubContext({
        trace_id: {
          value: 'a1b2c3d4e5f60123456789abcdef0001',
          loading: false,
        },
      })
    );

    expect(mockedQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "SELECT * FROM public.web_trace_demo WHERE trace_id = 'a1b2c3d4e5f60123456789abcdef0001'",
      })
    );
  });
});
