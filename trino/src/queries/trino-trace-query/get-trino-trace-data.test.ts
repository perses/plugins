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

import type { TraceQueryContext } from '@perses-dev/plugin-system';
import type { TraceData } from '@perses-dev/spec';
import type { Mock } from 'vitest';

import type { TrinoColumn, TrinoQueryParams, TrinoQueryResponse, TrinoRow } from '../../model/trino-client';
import { MAX_ROWS } from '../../model/trino-client';
import { buildSearchResult, groupByTrace } from './get-trino-trace-data';
import { parseSpans } from './trino-span-rows';
import { TrinoTraceQuery } from './TrinoTraceQuery';

const queryMock: Mock<(params: TrinoQueryParams) => Promise<TrinoQueryResponse>> = vi.fn();

const createContext = (withTimeRange = true): TraceQueryContext => ({
  datasourceStore: {
    getDatasource: vi.fn(),
    getDatasourceClient: vi.fn().mockResolvedValue({ query: queryMock }),
    listDatasourceSelectItems: vi.fn(),
    getLocalDatasources: vi.fn(),
    setLocalDatasources: vi.fn(),
    getSavedDatasources: vi.fn(),
    setSavedDatasources: vi.fn(),
  },
  absoluteTimeRange: withTimeRange
    ? {
        start: new Date('2025-01-01T00:00:00.000Z'),
        end: new Date('2025-01-02T00:00:00.000Z'),
      }
    : undefined,
  variableState: {
    service: { value: 'frontend', loading: false },
    tenant: { value: 'acme', loading: false },
  },
});

function respond(
  data: TrinoRow[],
  columns?: TrinoColumn[],
  extra: Partial<TrinoQueryResponse> = {},
): TrinoQueryResponse {
  const derived = [...new Set(data.flatMap((row) => Object.keys(row)))].map((name) => ({ name, type: '' }));
  return { status: 'success', data, columns: columns ?? (derived.length > 0 ? derived : undefined), ...extra };
}

const varchar = (...names: string[]): TrinoColumn[] => names.map((name) => ({ name, type: 'varchar' }));

async function runRaw(response: TrinoQueryResponse, query = 'SELECT 1', ctx = createContext()): Promise<TraceData> {
  queryMock.mockResolvedValueOnce(response);
  return TrinoTraceQuery.getTraceData({ query }, ctx);
}

// Adds the search results a single-trace result leaves out, so tests can check them too.
async function run(response: TrinoQueryResponse, query = 'SELECT 1', ctx = createContext()): Promise<TraceData> {
  const result = await runRaw(response, query, ctx);
  const search = buildSearchResult(groupByTrace(parseSpans(response).spans));
  return { ...result, searchResult: result.searchResult ?? search };
}

// A trimmed copy of what Trino 484 returned for the single trace example with PARAMETRIC_DATETIME.
const REAL_DETAIL = respond(
  [
    {
      trace_id: '5b8efff798038103d269b633813fc60c',
      span_id: 'eee19b7ec3c1b174',
      parent_span_id: null,
      service_name: 'frontend',
      span_name: 'GET /cart',
      span_kind: 'SERVER',
      start_time: '2026-11-22 14:38:35.811224476',
      duration_ms: 250,
      status_code: 'OK',
      attributes: { 'http.method': 'GET', 'deployment.environment': 'prod' },
    },
    {
      trace_id: '5b8efff798038103d269b633813fc60c',
      span_id: 'eee19b7ec3c1b175',
      parent_span_id: 'eee19b7ec3c1b174',
      service_name: 'cartservice',
      span_name: 'GetCart',
      span_kind: 'SERVER',
      start_time: '2026-11-22 14:38:35.821224476',
      duration_ms: 190,
      status_code: 'ERROR',
      attributes: { 'rpc.system': 'grpc', 'deployment.environment': 'prod' },
    },
  ],
  [
    ...varchar('trace_id', 'span_id', 'parent_span_id', 'service_name', 'span_name', 'span_kind'),
    { name: 'start_time', type: 'timestamp(9)' },
    { name: 'duration_ms', type: 'bigint' },
    ...varchar('status_code'),
    { name: 'attributes', type: 'map(varchar, varchar)' },
  ],
);

// The same trace selected as raw varbinary columns with attributes cast to json.
const REAL_VARBINARY = respond(
  [
    {
      trace_id: 'W47/95gDgQPSabYzgT/GDA==',
      span_id: '7uGbfsPBsXQ=',
      parent_span_id: null,
      service_name: 'frontend',
      span_name: 'GET /cart',
      start_time: '2026-11-22 14:26:15.354',
      end_time: '2026-11-22 14:26:15.604',
      status_code: 'OK',
      attributes: '{"deployment.environment":"prod","http.method":"GET"}',
    },
    {
      trace_id: 'W47/95gDgQPSabYzgT/GDA==',
      span_id: '7uGbfsPBsXU=',
      parent_span_id: '7uGbfsPBsXQ=',
      service_name: 'cartservice',
      span_name: 'GetCart',
      start_time: '2026-11-22 14:26:15.364',
      end_time: '2026-11-22 14:26:15.554',
      status_code: 'ERROR',
      attributes: '{"deployment.environment":"prod","rpc.system":"grpc"}',
    },
  ],
  [
    { name: 'trace_id', type: 'varbinary' },
    { name: 'span_id', type: 'varbinary' },
    { name: 'parent_span_id', type: 'varbinary' },
    ...varchar('service_name', 'span_name'),
    { name: 'start_time', type: 'timestamp(3)' },
    { name: 'end_time', type: 'timestamp(3)' },
    ...varchar('status_code'),
    { name: 'attributes', type: 'json' },
  ],
);

describe('TrinoTraceQuery', () => {
  beforeEach(() => queryMock.mockReset());

  it('resolves variable dependencies from the query and context fields', () => {
    const { variables } = TrinoTraceQuery.dependsOn!(
      { query: "SELECT 1 WHERE s = '$service'", schema: '$tenant' },
      createContext(),
    );
    expect(variables).toEqual(['service', 'tenant']);
  });

  it('creates initial options with an empty query', () => {
    expect(TrinoTraceQuery.createInitialOptions()).toEqual({ query: '' });
  });

  it('returns an empty search result for an empty query without querying', async () => {
    expect(await TrinoTraceQuery.getTraceData({ query: ' ' }, createContext())).toEqual({ searchResult: [] });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('interpolates variables and the time range, and asks for full precision timestamps', async () => {
    const signal = new AbortController().signal;
    queryMock.mockResolvedValueOnce(respond([]));
    const result = await TrinoTraceQuery.getTraceData(
      {
        query: "SELECT 1 WHERE s = '$service' AND t BETWEEN '{start}' AND '{end}'",
        catalog: 'iceberg',
        schema: '$tenant',
      },
      createContext(),
      signal,
    );

    expect(queryMock).toHaveBeenCalledWith({
      query: "SELECT 1 WHERE s = 'frontend' AND t BETWEEN '2025-01-01 00:00:00' AND '2025-01-02 00:00:00'",
      start: '2025-01-01 00:00:00',
      end: '2025-01-02 00:00:00',
      catalog: 'iceberg',
      schema: 'acme',
      fullPrecisionTimestamps: true,
      signal,
    });
    expect(result.metadata?.executedQueryString).toContain("s = 'frontend'");
  });

  it('leaves the time placeholders when there is no time range', async () => {
    await run(respond([]), 'SELECT {start}', createContext(false));
    expect(queryMock.mock.calls[0]![0].query).toBe('SELECT {start}');
  });

  it('returns only the full trace, without search results, for a real single-trace result', async () => {
    const raw = await runRaw(REAL_DETAIL);
    expect(raw.searchResult).toBeUndefined();
    expect(raw.trace).toBeDefined();

    const result = await run(REAL_DETAIL);

    expect(result.searchResult).toEqual([
      {
        traceId: '5b8efff798038103d269b633813fc60c',
        startTimeUnixMs: Date.parse('2026-11-22T14:38:35.811Z'),
        durationMs: 250,
        rootServiceName: 'frontend',
        rootTraceName: 'GET /cart',
        serviceStats: {
          frontend: { spanCount: 1 },
          cartservice: { spanCount: 1, errorCount: 1 },
        },
      },
    ]);
    expect(result.trace?.resourceSpans).toHaveLength(2);
    const frontend = result.trace!.resourceSpans[0]!;
    expect(frontend.resource?.attributes).toEqual([{ key: 'service.name', value: { stringValue: 'frontend' } }]);
    const span = frontend.scopeSpans[0]!.spans[0]!;
    expect(span).toMatchObject({
      traceId: '5b8efff798038103d269b633813fc60c',
      spanId: 'eee19b7ec3c1b174',
      name: 'GET /cart',
      kind: 'SPAN_KIND_SERVER',
      startTimeUnixNano: '1795358315811224476',
      endTimeUnixNano: '1795358316061224476',
      status: { code: 'STATUS_CODE_OK' },
    });
    expect(span.parentSpanId).toBeUndefined();
    expect(span.attributes).toEqual([
      { key: 'http.method', value: { stringValue: 'GET' } },
      { key: 'deployment.environment', value: { stringValue: 'prod' } },
    ]);
    const child = result.trace!.resourceSpans[1]!.scopeSpans[0]!.spans[0]!;
    expect(child.parentSpanId).toBe('eee19b7ec3c1b174');
    expect(child.status?.code).toBe('STATUS_CODE_ERROR');
  });

  it('converts varbinary ids to hex and parses JSON attributes for a real result', async () => {
    const result = await run(REAL_VARBINARY);

    expect(result.searchResult![0]!.traceId).toBe('5b8efff798038103d269b633813fc60c');
    const spans = result.trace!.resourceSpans.flatMap((r) => r.scopeSpans.flatMap((s) => s.spans));
    expect(spans.map((s) => [s.spanId, s.parentSpanId])).toEqual([
      ['eee19b7ec3c1b174', undefined],
      ['eee19b7ec3c1b175', 'eee19b7ec3c1b174'],
    ]);
    expect(spans[0]!.attributes).toEqual([
      { key: 'deployment.environment', value: { stringValue: 'prod' } },
      { key: 'http.method', value: { stringValue: 'GET' } },
    ]);
  });

  it('groups several traces into search results, newest first, without a full trace', async () => {
    const result = await run(
      respond([
        {
          trace_id: 'a',
          span_id: '1',
          parent_span_id: '',
          service_name: 'web',
          span_name: 'root-a',
          start_time: '2025-01-01 00:00:01',
        },
        {
          trace_id: 'a',
          span_id: '2',
          parent_span_id: '1',
          service_name: 'db',
          span_name: 'q',
          start_time: '2025-01-01 00:00:02',
          end_time: '2025-01-01 00:00:05',
          status_code: 'ERROR',
        },
        {
          trace_id: 'b',
          span_id: '3',
          parent_span_id: null,
          service_name: 'web',
          span_name: 'root-b',
          start_time: '2025-01-01 00:10:00',
          end_time: '2025-01-01 00:10:01',
        },
      ]),
    );

    expect(result.trace).toBeUndefined();
    expect(result.searchResult).toEqual([
      {
        traceId: 'b',
        startTimeUnixMs: Date.parse('2025-01-01T00:10:00Z'),
        durationMs: 1000,
        rootServiceName: 'web',
        rootTraceName: 'root-b',
        serviceStats: { web: { spanCount: 1 } },
      },
      {
        traceId: 'a',
        startTimeUnixMs: Date.parse('2025-01-01T00:00:01Z'),
        durationMs: 4000,
        rootServiceName: 'web',
        rootTraceName: 'root-a',
        serviceStats: {
          web: { spanCount: 1 },
          db: { spanCount: 1, errorCount: 1 },
        },
      },
    ]);
  });

  it('uses the earliest span as the root when every span has a parent', async () => {
    const result = await run(
      respond([
        {
          trace_id: 'a',
          span_id: '2',
          parent_span_id: 'x',
          service_name: 'late',
          span_name: 'late',
          start_time: '2025-01-01 00:00:02',
        },
        {
          trace_id: 'a',
          span_id: '1',
          parent_span_id: 'y',
          service_name: 'early',
          span_name: 'early',
          start_time: '2025-01-01 00:00:01',
        },
      ]),
    );
    expect(result.searchResult![0]).toMatchObject({
      rootServiceName: 'early',
      rootTraceName: 'early',
    });
  });

  it('defaults the service and span names when the columns are absent', async () => {
    const result = await run(respond([{ trace_id: 'a', span_id: '1', start_time: '2025-01-01 00:00:00' }]));
    expect(result.searchResult![0]).toMatchObject({
      rootServiceName: 'unknown',
      rootTraceName: '(unknown span)',
    });
  });

  it.each([
    ['end_time', { end_time: '2025-01-01 00:00:03' }, 3000],
    ['duration_ms', { duration_ms: 1500 }, 1500],
    ['duration_nano', { duration_nano: 2_000_000 }, 2],
    ['duration_ns as a string', { duration_ns: '4000000' }, 4],
    ['neither', {}, 0],
  ])('computes the span end from %s', async (_name, extra, durationMs) => {
    const result = await run(
      respond([
        {
          trace_id: 'a',
          span_id: '1',
          start_time: '2025-01-01 00:00:00',
          ...extra,
        },
      ]),
    );
    expect(result.searchResult![0]!.durationMs).toBe(durationMs);
  });

  it.each([
    ['timestamp(3)', '2025-01-01 00:00:00.123', '1735689600123000000'],
    ['timestamp(6)', '2025-01-01 00:00:00.123456', '1735689600123456000'],
    ['timestamp(9)', '2025-01-01 00:00:00.123456789', '1735689600123456789'],
    ['timestamp(9) with time zone', '2025-01-01 01:00:00.123456789 Europe/Paris', '1735689600123456789'],
    ['epoch milliseconds', 1735689600123, '1735689600123000000'],
  ])('keeps the precision of %s start times', async (_name, value, nanos) => {
    const result = await run(respond([{ trace_id: 'a', span_id: '1', start_time: value }]));
    expect(result.trace!.resourceSpans[0]!.scopeSpans[0]!.spans[0]!.startTimeUnixNano).toBe(nanos);
  });

  it.each([
    ['ERROR', 'STATUS_CODE_ERROR', 1],
    ['error', 'STATUS_CODE_ERROR', 1],
    ['STATUS_CODE_ERROR', 'STATUS_CODE_ERROR', 1],
    [2, 'STATUS_CODE_ERROR', 1],
    ['OK', 'STATUS_CODE_OK', undefined],
    [1, 'STATUS_CODE_OK', undefined],
    ['UNSET', 'STATUS_CODE_UNSET', undefined],
  ])('reads the status %s', async (status, code, errorCount) => {
    const result = await run(
      respond([
        {
          trace_id: 'a',
          span_id: '1',
          start_time: '2025-01-01 00:00:00',
          span_status_code: status,
        },
      ]),
    );
    expect(result.trace!.resourceSpans[0]!.scopeSpans[0]!.spans[0]!.status?.code).toBe(code);
    expect(result.searchResult![0]!.serviceStats.unknown!.errorCount).toBe(errorCount);
  });

  it.each([
    [
      'a map',
      { a: 'x', n: 3, f: 1.5, b: true, o: { k: 1 }, z: null },
      [
        { key: 'a', value: { stringValue: 'x' } },
        { key: 'n', value: { intValue: '3' } },
        { key: 'f', value: { doubleValue: 1.5 } },
        { key: 'b', value: { boolValue: true } },
        { key: 'o', value: { stringValue: '{"k":1}' } },
      ],
    ],
    ['a JSON string', '{"a":"x"}', [{ key: 'a', value: { stringValue: 'x' } }]],
    ['invalid JSON', 'not json', [{ key: 'attributes', value: { stringValue: 'not json' } }]],
    ['a JSON array', '[1,2]', [{ key: 'attributes', value: { stringValue: '[1,2]' } }]],
    ['null', null, []],
    ['an empty string', '', []],
  ])('reads attributes given as %s', async (_name, attributes, expected) => {
    const result = await run(
      respond([
        {
          trace_id: 'a',
          span_id: '1',
          start_time: '2025-01-01 00:00:00',
          attributes,
        },
      ]),
    );
    expect(result.trace!.resourceSpans[0]!.scopeSpans[0]!.spans[0]!.attributes).toEqual(expected);
  });

  it('accepts GreptimeDB column names in any letter case', async () => {
    const result = await run(
      respond([
        {
          TRACE_ID: 'a',
          Span_Id: '1',
          Timestamp: '2025-01-01 00:00:00',
          DURATION_NANO: 5_000_000,
          Span_Status_Code: 'STATUS_CODE_ERROR',
          'span_attributes.http.method': 'GET',
          'span_attributes.empty': '',
          'resource_attributes.host.name': 'h1',
          Service_Name: 'svc',
          scope_name: 'lib',
          scope_version: '1.0',
          span_kind: 'CLIENT',
        },
      ]),
    );

    expect(result.searchResult![0]).toMatchObject({
      durationMs: 5,
      rootServiceName: 'svc',
    });
    const resourceSpan = result.trace!.resourceSpans[0]!;
    expect(resourceSpan.resource?.attributes).toEqual([
      { key: 'service.name', value: { stringValue: 'svc' } },
      { key: 'host.name', value: { stringValue: 'h1' } },
    ]);
    expect(resourceSpan.scopeSpans[0]!.scope).toEqual({
      name: 'lib',
      version: '1.0',
    });
    const span = resourceSpan.scopeSpans[0]!.spans[0]!;
    expect(span.kind).toBe('SPAN_KIND_CLIENT');
    expect(span.attributes).toEqual([{ key: 'http.method', value: { stringValue: 'GET' } }]);
  });

  it('skips rows with a null id or an unparseable start and says so', async () => {
    const result = await run(
      respond([
        { trace_id: 'a', span_id: '1', start_time: '2025-01-01 00:00:00' },
        { trace_id: null, span_id: '2', start_time: '2025-01-01 00:00:00' },
        { trace_id: 'a', span_id: null, start_time: '2025-01-01 00:00:00' },
        { trace_id: 'a', span_id: '3', start_time: 'yesterday' },
      ]),
    );
    expect(result.searchResult).toHaveLength(1);
    expect(result.metadata?.notices).toEqual([
      {
        type: 'warning',
        message: '3 rows were skipped because they have no trace_id, span_id or parseable start time.',
      },
    ]);
  });

  it.each([
    ['trace_id', respond([{ span_id: '1', start_time: 'x' }], varchar('span_id', 'start_time'))],
    ['span_id', respond([{ trace_id: '1', start_time: 'x' }], varchar('trace_id', 'start_time'))],
    ['start_time or timestamp', respond([{ trace_id: '1', span_id: '2' }], varchar('trace_id', 'span_id'))],
  ])('fails with a clear error when %s is missing', async (missing, response) => {
    await expect(run(response)).rejects.toThrow(`missing the required column(s): ${missing}`);
  });

  it('returns no traces for a result without columns', async () => {
    expect((await run(respond([]))).searchResult).toEqual([]);
  });

  it('warns and flags more results when the result was truncated', async () => {
    const result = await run(
      respond([{ trace_id: 'a', span_id: '1', start_time: '2025-01-01 00:00:00' }], undefined, { truncated: true }),
    );
    expect(result.metadata).toMatchObject({
      notices: [
        {
          type: 'warning',
          message: `Results were truncated to the first ${MAX_ROWS} rows.`,
        },
      ],
      hasMoreResults: true,
    });
  });

  it('keeps hostile service names out of Object.prototype', async () => {
    const row = { trace_id: 'a', span_id: '1', start_time: '2025-01-01 00:00:00', status_code: 'ERROR' };
    const result = await run(
      respond([
        { ...row, service_name: '__proto__' },
        { ...row, span_id: '2', service_name: 'constructor' },
        { ...row, span_id: '3', service_name: '__proto__' },
      ]),
    );

    const stats = result.searchResult![0]!.serviceStats;
    expect(Object.keys(stats).toSorted()).toEqual(['__proto__', 'constructor']);
    expect(Object.getOwnPropertyDescriptor(stats, '__proto__')?.value).toEqual({ spanCount: 2, errorCount: 2 });
    expect(Object.getOwnPropertyDescriptor(stats, 'constructor')?.value).toEqual({ spanCount: 1, errorCount: 1 });
    expect(({} as { errorCount?: number }).errorCount).toBeUndefined();
    expect(({} as { spanCount?: number }).spanCount).toBeUndefined();
  });

  it('prefers start_time over timestamp, and end_time over duration_ms over duration_nano', async () => {
    const base = {
      trace_id: 'a',
      span_id: '1',
      start_time: '2025-01-01 00:00:00',
      timestamp: '2025-01-01 00:00:10',
      duration_ms: 1500,
      duration_nano: 9_000_000_000,
    };
    const withEnd = await run(respond([{ ...base, end_time: '2025-01-01 00:00:03' }]));
    const span = withEnd.trace!.resourceSpans[0]!.scopeSpans[0]!.spans[0]!;
    expect(span.startTimeUnixNano).toBe('1735689600000000000');
    expect(withEnd.searchResult![0]!.durationMs).toBe(3000);

    const withoutEnd = await run(respond([base]));
    expect(withoutEnd.searchResult![0]!.durationMs).toBe(1500);
  });

  it.each([
    [2, 'SPAN_KIND_SERVER'],
    [0, 'SPAN_KIND_UNSPECIFIED'],
    ['SPAN_KIND_SERVER', 'SPAN_KIND_SERVER'],
    ['server', 'SPAN_KIND_SERVER'],
    ['CLIENT', 'SPAN_KIND_CLIENT'],
    [null, 'SPAN_KIND_UNSPECIFIED'],
    [7, 'SPAN_KIND_UNSPECIFIED'],
    ['weird', 'SPAN_KIND_UNSPECIFIED'],
    ['SPAN_KIND_WEIRD', 'SPAN_KIND_UNSPECIFIED'],
  ])('normalises span_kind %s to %s', async (kind, expected) => {
    const result = await run(
      respond([{ trace_id: 'a', span_id: '1', start_time: '2025-01-01 00:00:00', span_kind: kind }]),
    );
    expect(result.trace!.resourceSpans[0]!.scopeSpans[0]!.spans[0]!.kind).toBe(expected);
  });

  it('keeps a varbinary id as text when it is not valid base64', async () => {
    const result = await run(
      respond(
        [{ trace_id: 'not base64!', span_id: 'AQI=', start_time: '2025-01-01 00:00:00' }],
        [
          { name: 'trace_id', type: 'varbinary' },
          { name: 'span_id', type: 'varbinary' },
          { name: 'start_time', type: 'timestamp' },
        ],
      ),
    );
    expect(result.searchResult![0]!.traceId).toBe('not base64!');
    expect(result.trace!.resourceSpans[0]!.scopeSpans[0]!.spans[0]!.spanId).toBe('0102');
  });

  it('uses the datasource selector from the spec', async () => {
    const ctx = createContext();
    queryMock.mockResolvedValueOnce(respond([]));
    const datasource = { kind: 'TrinoDatasource', name: 'other' };
    await TrinoTraceQuery.getTraceData({ query: 'SELECT 1', datasource }, ctx);
    expect(ctx.datasourceStore.getDatasourceClient).toHaveBeenCalledWith(datasource);
  });

  it.each(['status_message', 'span_status_message'])('reads %s into the status message', async (column) => {
    const result = await run(
      respond([
        { trace_id: 'a', span_id: '1', start_time: '2025-01-01 00:00:00', status_code: 'ERROR', [column]: 'boom' },
      ]),
    );
    expect(result.trace!.resourceSpans[0]!.scopeSpans[0]!.spans[0]!.status).toEqual({
      code: 'STATUS_CODE_ERROR',
      message: 'boom',
    });
  });
});
