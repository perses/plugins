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

import type * as PluginSystemModule from '@perses-dev/plugin-system';
import type { TraceQueryContext } from '@perses-dev/plugin-system';
import { replaceVariables } from '@perses-dev/plugin-system';
import type { DatasourceSpec } from '@perses-dev/spec';
import type { Mock, MockedFunction } from 'vitest';

import type { JaegerClient, JaegerTracesData } from '../model';
import { JaegerRequestError } from '../model';
import { getTraceData, normalizeTracesData } from './get-trace-data';
import { JaegerDatasource } from './jaeger-datasource';

vi.mock('@perses-dev/plugin-system', async (importOriginal) => {
  const actual = await importOriginal<typeof PluginSystemModule>();
  return {
    ...actual,
    replaceVariables: vi.fn((query: string) => query),
  };
});

const mockedReplaceVariables = replaceVariables as MockedFunction<typeof replaceVariables>;

const datasource = {
  directUrl: 'http://jaeger.example',
};

const TRACE_ID = '7d73f3ae841bf59a74cf5b52a328cfca';

// A trace as returned by Jaeger API v3: OTLP JSON with numeric enums.
const exampleTrace: JaegerTracesData = {
  resourceSpans: [
    {
      resource: {
        attributes: [
          { key: 'service.name', value: { stringValue: 'frontend' } },
          { key: 'telemetry.sdk.language', value: { stringValue: 'nodejs' } },
        ],
      },
      scopeSpans: [
        {
          scope: { name: 'http' },
          spans: [
            {
              traceId: TRACE_ID,
              spanId: 'aaaaaaaaaaaaaaaa',
              name: 'GET /api/cart',
              kind: 2,
              startTimeUnixNano: '1718122135000000000',
              endTimeUnixNano: '1718122135002000000',
              attributes: [{ key: 'http.method', value: { stringValue: 'GET' } }],
              status: { code: 1 },
            },
            {
              traceId: TRACE_ID,
              spanId: 'bbbbbbbbbbbbbbbb',
              parentSpanId: 'aaaaaaaaaaaaaaaa',
              name: 'SELECT cart',
              kind: 3,
              startTimeUnixNano: '1718122135000500000',
              endTimeUnixNano: '1718122135001000000',
              events: [{ timeUnixNano: '1718122135000700000', name: 'db timeout' }],
              links: [{ traceId: TRACE_ID.toUpperCase(), spanId: 'CCCCCCCCCCCCCCCC' }],
              status: { code: 2, message: 'timeout' },
            },
          ],
        },
      ],
    },
  ],
};

const makeClient = (): JaegerClient => {
  const client = JaegerDatasource.createClient(datasource, {});
  client.getTrace = vi.fn(async () => exampleTrace);
  client.searchTraces = vi.fn(async () => exampleTrace);
  return client;
};

const getDatasource: Mock = vi.fn((): DatasourceSpec<typeof datasource> => ({
  default: false,
  plugin: {
    kind: 'JaegerDatasource',
    spec: datasource,
  },
}));

function createContext(client: JaegerClient): TraceQueryContext {
  return {
    variableState: {},
    datasourceStore: {
      getDatasource,
      getDatasourceClient: vi.fn(() => Promise.resolve(client)),
      listDatasourceSelectItems: vi.fn(async () => []),
      getLocalDatasources: vi.fn(),
      setLocalDatasources: vi.fn(),
      getSavedDatasources: vi.fn(),
      setSavedDatasources: vi.fn(),
    },
    absoluteTimeRange: {
      start: new Date('2024-06-11T10:00:00.000Z'),
      end: new Date('2024-06-11T11:00:00.000Z'),
    },
  } as TraceQueryContext;
}

describe('normalizeTracesData', () => {
  it('converts the numeric OTLP enums, ids and keeps the rest of the span', () => {
    const trace = normalizeTracesData(exampleTrace);
    const spans = trace.resourceSpans[0]?.scopeSpans[0]?.spans ?? [];

    expect(spans).toHaveLength(2);
    expect(spans[0]).toMatchObject({
      traceId: TRACE_ID,
      spanId: 'aaaaaaaaaaaaaaaa',
      name: 'GET /api/cart',
      kind: 'SPAN_KIND_SERVER',
      startTimeUnixNano: '1718122135000000000',
      attributes: [{ key: 'http.method', value: { stringValue: 'GET' } }],
      status: { code: 'STATUS_CODE_OK' },
    });
    expect(spans[0]?.parentSpanId).toBeUndefined();
    expect(spans[1]).toMatchObject({
      parentSpanId: 'aaaaaaaaaaaaaaaa',
      kind: 'SPAN_KIND_CLIENT',
      events: [{ timeUnixNano: '1718122135000700000', name: 'db timeout' }],
      status: { code: 'STATUS_CODE_ERROR', message: 'timeout' },
    });
    expect(spans[1]?.links).toEqual([{ traceId: TRACE_ID, spanId: 'cccccccccccccccc' }]);
    expect(trace.resourceSpans[0]?.resource?.attributes?.[0]).toEqual({
      key: 'service.name',
      value: { stringValue: 'frontend' },
    });
    expect(trace.resourceSpans[0]?.scopeSpans[0]?.scope).toEqual({ name: 'http' });
  });

  it('keeps enum names and pads short ids', () => {
    const trace = normalizeTracesData({
      resourceSpans: [
        {
          scopeSpans: [
            {
              spans: [
                {
                  traceId: 'ABC',
                  spanId: 'D',
                  name: 'op',
                  kind: 'SPAN_KIND_PRODUCER',
                  startTimeUnixNano: '1',
                  endTimeUnixNano: '2',
                  status: { code: 'STATUS_CODE_ERROR' },
                },
              ],
            },
          ],
        },
      ],
    });
    const span = trace.resourceSpans[0]?.scopeSpans[0]?.spans[0];

    expect(span?.traceId).toBe('00000000000000000000000000000abc');
    expect(span?.spanId).toBe('000000000000000d');
    expect(span?.kind).toBe('SPAN_KIND_PRODUCER');
    expect(span?.status?.code).toBe('STATUS_CODE_ERROR');
  });

  it('handles a response without spans', () => {
    expect(normalizeTracesData({})).toEqual({ resourceSpans: [] });
    expect(normalizeTracesData({ resourceSpans: [{}] })).toEqual({ resourceSpans: [{ scopeSpans: [] }] });
  });
});

describe('getTraceData', () => {
  beforeEach(() => {
    mockedReplaceVariables.mockReset();
    mockedReplaceVariables.mockImplementation((query: string) => query);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches a single trace by trace id', async () => {
    const client = makeClient();
    const result = await getTraceData({ traceId: TRACE_ID }, createContext(client));

    expect(client.getTrace).toHaveBeenCalledWith(TRACE_ID);
    expect(result.trace?.resourceSpans[0]?.scopeSpans[0]?.spans).toHaveLength(2);
    expect(result.trace?.resourceSpans[0]?.scopeSpans[0]?.spans[0]?.kind).toBe('SPAN_KIND_SERVER');
    expect(result.metadata?.executedQueryString).toBe(TRACE_ID);
  });

  it('reports a trace that does not exist', async () => {
    const notFound = new JaegerRequestError('No traces found', 404);
    const client = makeClient();
    client.getTrace = vi.fn(async () => {
      throw notFound;
    });
    await expect(getTraceData({ traceId: TRACE_ID }, createContext(client))).rejects.toThrow(
      `Trace ${TRACE_ID} was not found.`,
    );

    client.getTrace = vi.fn(async () => ({}));
    await expect(getTraceData({ traceId: TRACE_ID }, createContext(client))).rejects.toThrow(
      `Trace ${TRACE_ID} was not found.`,
    );
  });

  it('does not hide other failures of a trace lookup', async () => {
    const client = makeClient();
    client.getTrace = vi.fn(async () => {
      throw new JaegerRequestError('Jaeger request failed with status 500', 500);
    });

    await expect(getTraceData({ traceId: TRACE_ID }, createContext(client))).rejects.toThrow(
      'Jaeger request failed with status 500',
    );
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
      context,
    );

    expect(client.searchTraces).toHaveBeenCalledWith({
      service: 'frontend',
      operation: 'GET /api/cart',
      spanKind: 'server',
      tags: '{"http.status_code":"500"}',
      minDuration: '20ms',
      maxDuration: undefined,
      limit: 26,
      startTime: new Date('2024-06-11T10:00:00.000Z'),
      endTime: new Date('2024-06-11T11:00:00.000Z'),
    });
    expect(result.searchResult).toEqual([
      {
        traceId: TRACE_ID,
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

  it('groups the spans of several traces and services, most recent trace first', async () => {
    const olderTraceId = '11111111111111111111111111111111';
    const client = makeClient();
    client.searchTraces = vi.fn(async () => ({
      resourceSpans: [
        // The older trace comes first, and one of its spans belongs to another service.
        {
          resource: { attributes: [{ key: 'service.name', value: { stringValue: 'cart' } }] },
          scopeSpans: [
            {
              spans: [
                {
                  traceId: olderTraceId,
                  spanId: '2222222222222222',
                  parentSpanId: '1111111111111111',
                  name: 'lookup',
                  startTimeUnixNano: '1718000000100000000',
                  endTimeUnixNano: '1718000000200000000',
                  attributes: [{ key: 'error', value: { boolValue: true } }],
                },
              ],
            },
          ],
        },
        {
          resource: { attributes: [{ key: 'service.name', value: { stringValue: 'frontend' } }] },
          scopeSpans: [
            {
              spans: [
                {
                  traceId: olderTraceId,
                  spanId: '1111111111111111',
                  name: 'GET /old',
                  startTimeUnixNano: '1718000000000000000',
                  endTimeUnixNano: '1718000000300000000',
                },
              ],
            },
          ],
        },
        ...(exampleTrace.resourceSpans ?? []),
      ],
    }));

    const result = await getTraceData({ service: 'frontend' }, createContext(client));

    expect(result.searchResult?.map((trace) => trace.traceId)).toEqual([TRACE_ID, olderTraceId]);
    expect(result.searchResult?.[1]).toEqual({
      traceId: olderTraceId,
      startTimeUnixMs: 1718000000000,
      durationMs: 300,
      rootServiceName: 'frontend',
      rootTraceName: 'GET /old',
      serviceStats: {
        frontend: { spanCount: 1 },
        cart: { spanCount: 1, errorCount: 1 },
      },
    });
  });

  it('returns no results when Jaeger finds no traces', async () => {
    const client = makeClient();
    client.searchTraces = vi.fn(async () => ({}));

    const result = await getTraceData({ service: 'frontend' }, createContext(client));

    expect(result.searchResult).toEqual([]);
    expect(result.metadata?.hasMoreResults).toBe(false);
  });

  it('searches the last hour when the query has no time range', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-11T12:00:00.000Z'));
    const client = makeClient();
    const context = createContext(client);
    context.absoluteTimeRange = undefined;

    await getTraceData({ service: 'frontend' }, context);

    expect(client.searchTraces).toHaveBeenCalledWith(
      expect.objectContaining({
        startTime: new Date('2024-06-11T11:00:00.000Z'),
        endTime: new Date('2024-06-11T12:00:00.000Z'),
      }),
    );
  });

  it('rejects invalid tags and missing search service', async () => {
    const client = makeClient();

    await expect(getTraceData({ tags: '[]' }, createContext(client))).rejects.toThrow(
      'Jaeger tags must be a JSON object.',
    );
    await expect(getTraceData({ service: 'frontend', tags: '{"a":{"b":1}}' }, createContext(client))).rejects.toThrow(
      'Jaeger tag "a" must be a string, a number or a boolean.',
    );
    await expect(getTraceData({ operation: 'GET /api/cart' }, createContext(client))).rejects.toThrow(
      'Jaeger trace searches require a service when Trace ID is not provided.',
    );
  });

  it('keeps one extra search result only to detect additional matches', async () => {
    const client = makeClient();
    client.searchTraces = vi.fn(async () => ({
      resourceSpans: [0, 1, 2].map((index) => ({
        resource: { attributes: [{ key: 'service.name', value: { stringValue: 'frontend' } }] },
        scopeSpans: [
          {
            spans: [
              {
                traceId: `7d73f3ae841bf59a74cf5b52a328cfc${index}`,
                spanId: 'aaaaaaaaaaaaaaaa',
                name: 'GET /api/cart',
                startTimeUnixNano: `${1718122135000000000 + index * 1000000000}`,
                endTimeUnixNano: `${1718122135002000000 + index * 1000000000}`,
              },
            ],
          },
        ],
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
      startTime: new Date('2024-06-11T10:00:00.000Z'),
      endTime: new Date('2024-06-11T11:00:00.000Z'),
    });
    expect(result.searchResult).toHaveLength(2);
    expect(result.metadata?.hasMoreResults).toBe(true);
    expect(result.metadata?.notices).toContainEqual({
      type: 'info',
      message: 'Not all matching traces are currently displayed. Increase the result limit to view additional traces.',
    });
  });
});
