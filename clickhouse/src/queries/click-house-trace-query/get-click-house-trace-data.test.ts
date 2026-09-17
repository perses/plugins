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
import type { Mock } from 'vitest';

import { ClickHouseDatasource } from '../../datasources/click-house-datasource';
import type { ClickHouseQueryResponse } from '../../model/click-house-client';
import type { ClickHouseTraceSpanRow, ClickHouseTraceSummaryRow } from './click-house-trace-query-types';
import { getClickHouseTraceData } from './get-click-house-trace-data';

const TRACE_ID = '5b8efff798038103d269b633813fc60c';
const OTHER_TRACE_ID = '0af7651916cd43dd8448eb211c80319c';

const createStubContext = (
  data: unknown,
  status: ClickHouseQueryResponse['status'] = 'success',
): { context: TraceQueryContext; query: Mock } => {
  const client = ClickHouseDatasource.createClient({ directUrl: '/test' }, {});
  const query: Mock = vi.fn(async () => ({ status, data }));
  client.query = query;

  const getDatasourceClient: Mock = vi.fn(async () => client);
  const context: TraceQueryContext = {
    datasourceStore: {
      getDatasource: vi.fn(),
      getDatasourceClient,
      listDatasourceSelectItems: vi.fn(),
      getLocalDatasources: vi.fn(),
      setLocalDatasources: vi.fn(),
      getSavedDatasources: vi.fn(),
      setSavedDatasources: vi.fn(),
    },
    absoluteTimeRange: {
      start: new Date('2025-01-01T00:00:00.000Z'),
      end: new Date('2025-01-02T00:00:00.000Z'),
    },
    variableState: {},
  };
  return { context, query };
};

const executedQuery = (query: Mock): string => query.mock.calls[0]![0].query;

const traceSpanRow = (row: Partial<ClickHouseTraceSpanRow>): ClickHouseTraceSpanRow => ({
  TraceId: TRACE_ID,
  SpanId: '',
  ParentSpanId: '',
  SpanName: '',
  SpanKind: 'Internal',
  ServiceName: 'frontend',
  ResourceAttributes: { 'service.name': 'frontend' },
  ScopeName: '',
  ScopeVersion: '',
  SpanAttributes: {},
  StartTimeUnixNano: '1735689600000000000',
  DurationNano: '0',
  StatusCode: 'Unset',
  StatusMessage: '',
  EventTimesUnixNano: [],
  EventNames: [],
  EventAttributes: [],
  LinkTraceIds: [],
  LinkSpanIds: [],
  LinkAttributes: [],
  ...row,
});

const summaryRow = (row: Partial<ClickHouseTraceSummaryRow>): ClickHouseTraceSummaryRow => ({
  TraceId: TRACE_ID,
  StartTimeUnixNano: '1735689600000000000',
  EndTimeUnixNano: '1735689600400000000',
  RootServiceName: 'frontend',
  RootSpanName: 'GET /cart',
  SpanCounts: { frontend: 1, cart: 2 },
  ErrorCounts: { frontend: 0, cart: 1 },
  ...row,
});

describe('getClickHouseTraceData', () => {
  it('should return an empty search result for an empty query without querying ClickHouse', async () => {
    const { context, query } = createStubContext([]);

    const result = await getClickHouseTraceData({ query: '  ' }, context);

    expect(result).toEqual({ searchResult: [] });
    expect(query).not.toHaveBeenCalled();
  });

  describe('with a trace ID', () => {
    it('should fetch the spans of the trace from the default table', async () => {
      const { context, query } = createStubContext([traceSpanRow({ SpanId: 'eee19b7ec3c1b174' })]);

      const result = await getClickHouseTraceData({ query: TRACE_ID }, context);

      expect(query).toHaveBeenCalledTimes(1);
      expect(executedQuery(query)).toContain('FROM otel_traces\n');
      expect(executedQuery(query)).toContain(`WHERE TraceId = '${TRACE_ID}'`);
      expect(result.metadata?.executedQueryString).toBe(executedQuery(query));
      expect(result.searchResult).toBeUndefined();
    });

    it('should convert the spans to OTLP, grouped by resource and instrumentation scope', async () => {
      const { context } = createStubContext([
        traceSpanRow({
          SpanId: 'eee19b7ec3c1b174',
          SpanName: 'GET /cart',
          SpanKind: 'Server',
          ResourceAttributes: { 'service.name': 'frontend', 'host.name': 'web-1' },
          ScopeName: '@opentelemetry/instrumentation-http',
          ScopeVersion: '0.52.0',
          SpanAttributes: { 'http.request.method': 'GET' },
          DurationNano: '250000000',
          StatusCode: 'Ok',
          EventTimesUnixNano: ['1735689600100000000'],
          EventNames: ['cache.miss'],
          EventAttributes: [{ 'cache.key': 'cart' }],
        }),
        traceSpanRow({
          SpanId: 'b7ad6b7169203331',
          ParentSpanId: 'eee19b7ec3c1b174',
          SpanName: 'GET /api/cart',
          SpanKind: 'Client',
          ResourceAttributes: { 'service.name': 'frontend', 'host.name': 'web-1' },
          ScopeName: '@opentelemetry/instrumentation-http',
          ScopeVersion: '0.52.0',
          StartTimeUnixNano: '1735689600050000000',
          DurationNano: '120000000',
          StatusCode: 'Error',
          StatusMessage: 'upstream timed out',
          LinkTraceIds: [OTHER_TRACE_ID],
          LinkSpanIds: ['00f067aa0ba902b7'],
          LinkAttributes: [{ 'link.reason': 'retry' }],
        }),
        traceSpanRow({
          SpanId: '53995c3f42cd8ad8',
          ParentSpanId: 'b7ad6b7169203331',
          SpanName: 'cart.get',
          SpanKind: 'SPAN_KIND_SERVER',
          ServiceName: 'cart',
          ResourceAttributes: {},
          ScopeName: 'cart-service',
          StartTimeUnixNano: '1735689600060000000',
          DurationNano: '100000000',
          StatusCode: 'STATUS_CODE_ERROR',
        }),
      ]);

      const result = await getClickHouseTraceData({ query: TRACE_ID }, context);

      expect(result.trace).toEqual({
        resourceSpans: [
          {
            resource: {
              attributes: [
                { key: 'service.name', value: { stringValue: 'frontend' } },
                { key: 'host.name', value: { stringValue: 'web-1' } },
              ],
            },
            scopeSpans: [
              {
                scope: { name: '@opentelemetry/instrumentation-http', version: '0.52.0' },
                spans: [
                  {
                    traceId: TRACE_ID,
                    spanId: 'eee19b7ec3c1b174',
                    parentSpanId: undefined,
                    name: 'GET /cart',
                    kind: 'SPAN_KIND_SERVER',
                    startTimeUnixNano: '1735689600000000000',
                    endTimeUnixNano: '1735689600250000000',
                    attributes: [{ key: 'http.request.method', value: { stringValue: 'GET' } }],
                    events: [
                      {
                        timeUnixNano: '1735689600100000000',
                        name: 'cache.miss',
                        attributes: [{ key: 'cache.key', value: { stringValue: 'cart' } }],
                      },
                    ],
                    links: [],
                    status: { code: 'STATUS_CODE_OK', message: undefined },
                  },
                  {
                    traceId: TRACE_ID,
                    spanId: 'b7ad6b7169203331',
                    parentSpanId: 'eee19b7ec3c1b174',
                    name: 'GET /api/cart',
                    kind: 'SPAN_KIND_CLIENT',
                    startTimeUnixNano: '1735689600050000000',
                    endTimeUnixNano: '1735689600170000000',
                    attributes: [],
                    events: [],
                    links: [
                      {
                        traceId: OTHER_TRACE_ID,
                        spanId: '00f067aa0ba902b7',
                        attributes: [{ key: 'link.reason', value: { stringValue: 'retry' } }],
                      },
                    ],
                    status: { code: 'STATUS_CODE_ERROR', message: 'upstream timed out' },
                  },
                ],
              },
            ],
          },
          {
            resource: { attributes: [{ key: 'service.name', value: { stringValue: 'cart' } }] },
            scopeSpans: [
              {
                scope: { name: 'cart-service', version: '' },
                spans: [
                  {
                    traceId: TRACE_ID,
                    spanId: '53995c3f42cd8ad8',
                    parentSpanId: 'b7ad6b7169203331',
                    name: 'cart.get',
                    kind: 'SPAN_KIND_SERVER',
                    startTimeUnixNano: '1735689600060000000',
                    endTimeUnixNano: '1735689600160000000',
                    attributes: [],
                    events: [],
                    links: [],
                    status: { code: 'STATUS_CODE_ERROR', message: undefined },
                  },
                ],
              },
            ],
          },
        ],
      });
    });

    it('should normalize 16 character and uppercase trace IDs to the format stored by the exporter', async () => {
      const { context, query } = createStubContext([traceSpanRow({})]);

      await getClickHouseTraceData({ query: 'ABCDEF0123456789' }, context);

      expect(executedQuery(query)).toContain("WHERE TraceId = '0000000000000000abcdef0123456789'");
    });

    it('should resolve variables before detecting a trace ID', async () => {
      const { context, query } = createStubContext([traceSpanRow({})]);
      context.variableState = { traceId: { value: TRACE_ID, loading: false } };

      const result = await getClickHouseTraceData({ query: '$traceId' }, context);

      expect(executedQuery(query)).toContain(`WHERE TraceId = '${TRACE_ID}'`);
      expect(result.trace).toBeDefined();
    });

    it('should read the spans from the configured table', async () => {
      const { context, query } = createStubContext([traceSpanRow({})]);

      await getClickHouseTraceData({ query: TRACE_ID, table: 'otel.otel_traces' }, context);

      expect(executedQuery(query)).toContain('FROM otel.otel_traces\n');
    });

    it('should reject a table that is not a table name', async () => {
      const { context, query } = createStubContext([traceSpanRow({})]);

      await expect(
        getClickHouseTraceData({ query: TRACE_ID, table: "otel_traces WHERE TraceId != ''" }, context),
      ).rejects.toThrow('Invalid trace table');
      expect(query).not.toHaveBeenCalled();
    });

    it('should throw when the trace is not found', async () => {
      const { context } = createStubContext([]);

      await expect(getClickHouseTraceData({ query: TRACE_ID }, context)).rejects.toThrow(
        `Trace ${TRACE_ID} was not found in otel_traces.`,
      );
    });
  });

  describe('with a SQL query', () => {
    it('should group the spans into traces in ClickHouse, and ask for one trace more than the limit', async () => {
      const { context, query } = createStubContext([
        summaryRow({}),
        summaryRow({
          TraceId: OTHER_TRACE_ID,
          StartTimeUnixNano: '1735690200000000000',
          EndTimeUnixNano: '1735690200050000000',
          RootSpanName: 'POST /checkout',
          SpanCounts: { frontend: 1 },
          ErrorCounts: { frontend: 0 },
        }),
      ]);

      const result = await getClickHouseTraceData({ query: 'SELECT * FROM otel_traces' }, context);

      expect(executedQuery(query)).toContain('FROM (\nSELECT * FROM otel_traces\n)');
      expect(executedQuery(query)).toContain('GROUP BY TraceId');
      expect(executedQuery(query)).toContain('LIMIT 21');
      expect(result.searchResult).toEqual([
        {
          traceId: TRACE_ID,
          rootServiceName: 'frontend',
          rootTraceName: 'GET /cart',
          startTimeUnixMs: Date.parse('2025-01-01T00:00:00Z'),
          durationMs: 400,
          serviceStats: { frontend: { spanCount: 1 }, cart: { spanCount: 2, errorCount: 1 } },
        },
        {
          traceId: OTHER_TRACE_ID,
          rootServiceName: 'frontend',
          rootTraceName: 'POST /checkout',
          startTimeUnixMs: Date.parse('2025-01-01T00:10:00Z'),
          durationMs: 50,
          serviceStats: { frontend: { spanCount: 1 } },
        },
      ]);
      expect(result.trace).toBeUndefined();
      expect(result.metadata?.hasMoreResults).toBe(false);
      expect(result.metadata?.notices).toEqual([]);
    });

    it('should report that more traces match when ClickHouse returns more rows than the limit', async () => {
      const { context, query } = createStubContext([
        summaryRow({ TraceId: 'a' }),
        summaryRow({ TraceId: 'b' }),
        summaryRow({ TraceId: 'c' }),
      ]);

      const result = await getClickHouseTraceData({ query: 'SELECT * FROM otel_traces', limit: 2 }, context);

      expect(executedQuery(query)).toContain('LIMIT 3');
      expect(result.searchResult?.map((trace) => trace.traceId)).toEqual(['a', 'b']);
      expect(result.metadata?.hasMoreResults).toBe(true);
      expect(result.metadata?.notices).toEqual([
        {
          type: 'info',
          message:
            'Not all matching traces are currently displayed. Increase the result limit to view additional traces.',
        },
      ]);
    });

    it('should run a 16 or 32 character SQL query as a search, not as a trace ID lookup', async () => {
      const { context, query } = createStubContext([]);

      await getClickHouseTraceData({ query: 'SELECT * FROM t1' }, context);

      expect('SELECT * FROM t1'.length).toBe(16);
      expect(executedQuery(query)).toContain('GROUP BY TraceId');
      expect(executedQuery(query)).not.toContain("WHERE TraceId = '");
    });

    it('should replace the time range placeholders in the search query', async () => {
      const { context, query } = createStubContext([]);

      const result = await getClickHouseTraceData(
        { query: "SELECT * FROM otel_traces WHERE Timestamp BETWEEN '{start}' AND '{end}'" },
        context,
      );

      const expectedSubQuery =
        "SELECT * FROM otel_traces WHERE Timestamp BETWEEN '2025-01-01 00:00:00' AND '2025-01-02 00:00:00'";
      expect(executedQuery(query)).toContain(`FROM (\n${expectedSubQuery}\n)`);
      expect(result.metadata?.executedQueryString).toBe(executedQuery(query));
      expect(result.searchResult).toEqual([]);
    });

    it('should strip a trailing semicolon from the search query', async () => {
      const { context, query } = createStubContext([]);

      await getClickHouseTraceData({ query: 'SELECT * FROM otel_traces;  ' }, context);

      expect(executedQuery(query)).toContain('FROM (\nSELECT * FROM otel_traces\n)');
    });

    it('should reject a search query that ends with a FORMAT clause', async () => {
      const { context, query } = createStubContext([]);

      await expect(
        getClickHouseTraceData({ query: 'SELECT * FROM otel_traces FORMAT JSONEachRow' }, context),
      ).rejects.toThrow('cannot end with a FORMAT clause');
      expect(query).not.toHaveBeenCalled();
    });

    it('should fall back to unknown when the root span has no service name', async () => {
      const { context } = createStubContext([summaryRow({ RootServiceName: '', RootSpanName: '' })]);

      const result = await getClickHouseTraceData({ query: 'SELECT * FROM otel_traces' }, context);

      expect(result.searchResult?.[0]).toMatchObject({ rootServiceName: 'unknown', rootTraceName: TRACE_ID });
    });

    it('should throw when ClickHouse returns an error', async () => {
      const { context } = createStubContext([], 'error');

      await expect(getClickHouseTraceData({ query: 'SELECT * FROM missing_table' }, context)).rejects.toThrow(
        'ClickHouse returned an error for the trace query',
      );
    });
  });
});
