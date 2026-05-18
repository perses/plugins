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
import { replaceVariables, TraceQueryContext } from '@perses-dev/plugin-system';
import { JaegerClient } from '../model';
import { JaegerDatasource } from './jaeger-datasource';
import { getTraceData, jaegerTraceToOTLP } from './get-trace-data';

jest.mock('@perses-dev/plugin-system', () => {
  const actual = jest.requireActual('@perses-dev/plugin-system');
  return {
    ...actual,
    replaceVariables: jest.fn((query: string) => query),
  };
});

const mockedReplaceVariables = replaceVariables as jest.MockedFunction<typeof replaceVariables>;

const datasource = {
  directUrl: 'http://jaeger.example',
};

const exampleTrace = {
  traceID: '7d73f3ae841bf59a74cf5b52a328cfca',
  processes: {
    p1: {
      serviceName: 'frontend',
      tags: [{ key: 'telemetry.sdk.language', type: 'string' as const, value: 'nodejs' }],
    },
  },
  spans: [
    {
      traceID: '7d73f3ae841bf59a74cf5b52a328cfca',
      spanID: 'aaaaaaaaaaaaaaaa',
      operationName: 'GET /api/cart',
      startTime: 1718122135000000,
      duration: 2000,
      processID: 'p1',
      tags: [{ key: 'span.kind', type: 'string' as const, value: 'server' }],
      logs: [],
      references: [],
    },
    {
      traceID: '7d73f3ae841bf59a74cf5b52a328cfca',
      spanID: 'bbbbbbbbbbbbbbbb',
      operationName: 'SELECT cart',
      startTime: 1718122135000500,
      duration: 500,
      processID: 'p1',
      tags: [
        { key: 'span.kind', type: 'string' as const, value: 'client' },
        { key: 'otel.status_code', type: 'string' as const, value: 'ERROR' },
      ],
      logs: [
        {
          timestamp: 1718122135000700,
          fields: [{ key: 'event', type: 'string' as const, value: 'db timeout' }],
        },
      ],
      references: [
        {
          refType: 'CHILD_OF' as const,
          traceID: '7d73f3ae841bf59a74cf5b52a328cfca',
          spanID: 'aaaaaaaaaaaaaaaa',
        },
      ],
    },
  ],
};

const makeClient = (): JaegerClient => {
  const client = JaegerDatasource.createClient(datasource, {});
  client.getTrace = jest.fn(async () => ({ data: [exampleTrace] }));
  client.searchTraces = jest.fn(async () => ({ data: [exampleTrace] }));
  return client;
};

const getDatasource: jest.Mock = jest.fn(
  (): DatasourceSpec<typeof datasource> => ({
    default: false,
    plugin: {
      kind: 'JaegerDatasource',
      spec: datasource,
    },
  })
);

function createContext(client: JaegerClient): TraceQueryContext {
  return {
    variableState: {},
    datasourceStore: {
      getDatasource,
      getDatasourceClient: jest.fn(() => Promise.resolve(client)),
      listDatasourceSelectItems: jest.fn(async () => []),
      getLocalDatasources: jest.fn(),
      setLocalDatasources: jest.fn(),
      getSavedDatasources: jest.fn(),
      setSavedDatasources: jest.fn(),
    },
    absoluteTimeRange: {
      start: new Date('2024-06-11T10:00:00.000Z'),
      end: new Date('2024-06-11T11:00:00.000Z'),
    },
  } as TraceQueryContext;
}

describe('jaegerTraceToOTLP', () => {
  it('converts parent relationships, events, ids, and status', () => {
    const trace = jaegerTraceToOTLP(exampleTrace);
    const spans = trace.resourceSpans[0]?.scopeSpans[0]?.spans ?? [];

    expect(spans).toHaveLength(2);
    expect(spans[0]?.traceId).toBe('7d73f3ae841bf59a74cf5b52a328cfca');
    expect(spans[1]?.parentSpanId).toBe('aaaaaaaaaaaaaaaa');
    expect(spans[1]?.events?.[0]?.name).toBe('db timeout');
    expect(spans[1]?.status?.code).toBe('STATUS_CODE_ERROR');
    expect(trace.resourceSpans[0]?.resource?.attributes?.[0]).toEqual({
      key: 'service.name',
      value: { stringValue: 'frontend' },
    });
  });
});

describe('getTraceData', () => {
  beforeEach(() => {
    mockedReplaceVariables.mockReset();
    mockedReplaceVariables.mockImplementation((query: string) => query);
  });

  it('fetches a single trace by trace id', async () => {
    const client = makeClient();
    const result = await getTraceData({ traceId: '7d73f3ae841bf59a74cf5b52a328cfca' }, createContext(client));

    expect(client.getTrace).toHaveBeenCalledWith('7d73f3ae841bf59a74cf5b52a328cfca');
    expect(result.trace?.resourceSpans[0]?.scopeSpans[0]?.spans).toHaveLength(2);
    expect(result.metadata?.executedQueryString).toBe('7d73f3ae841bf59a74cf5b52a328cfca');
  });

  it('builds a jaeger search request and summarizes traces', async () => {
    const client = makeClient();
    const context = createContext(client);
    context.variableState = {
      service: { value: 'frontend', loading: false },
    };

    mockedReplaceVariables.mockImplementation((query: string) => query.replace('$service', 'frontend'));

    const result = await getTraceData(
      {
        service: '$service',
        operation: 'GET /api/cart',
        spanKind: 'server',
        tags: '{"http.status_code":"500"}',
        minDuration: '20ms',
        limit: 25,
      },
      context
    );

    expect(client.searchTraces).toHaveBeenCalledWith({
      service: 'frontend',
      operation: 'GET /api/cart',
      spanKind: 'server',
      tags: '{"http.status_code":"500"}',
      minDuration: '20ms',
      maxDuration: undefined,
      limit: 26,
      start: 1718100000000000,
      end: 1718103600000000,
    });
    expect(result.searchResult).toEqual([
      {
        traceId: '7d73f3ae841bf59a74cf5b52a328cfca',
        startTimeUnixMs: 1718122135000,
        durationMs: 2,
        rootServiceName: 'frontend',
        rootTraceName: 'GET /api/cart',
        serviceStats: {
          frontend: {
            spanCount: 2,
            errorCount: 1,
          },
        },
      },
    ]);
    expect(result.metadata?.hasMoreResults).toBe(false);
  });

  it('rejects invalid tags and missing search service', async () => {
    const client = makeClient();

    await expect(getTraceData({ tags: '[]' }, createContext(client))).rejects.toThrow(
      'Jaeger tags must be a JSON object.'
    );
    await expect(getTraceData({ operation: 'GET /api/cart' }, createContext(client))).rejects.toThrow(
      'Jaeger trace searches require a service when Trace ID is not provided.'
    );
  });

  it('keeps one extra search result only to detect additional matches', async () => {
    const client = makeClient();
    client.searchTraces = jest.fn(async () => ({
      data: Array.from({ length: 3 }, (_, index) => ({
        ...exampleTrace,
        traceID: `7d73f3ae841bf59a74cf5b52a328cfc${index}`,
      })),
    }));

    const result = await getTraceData({ service: 'frontend', limit: 2 }, createContext(client));

    expect(client.searchTraces).toHaveBeenCalledWith({
      service: 'frontend',
      operation: undefined,
      spanKind: undefined,
      tags: undefined,
      minDuration: undefined,
      maxDuration: undefined,
      limit: 3,
      start: 1718100000000000,
      end: 1718103600000000,
    });
    expect(result.searchResult).toHaveLength(2);
    expect(result.metadata?.hasMoreResults).toBe(true);
    expect(result.metadata?.notices).toContainEqual({
      type: 'info',
      message: 'Not all matching traces are currently displayed. Increase the result limit to view additional traces.',
    });
  });
});
