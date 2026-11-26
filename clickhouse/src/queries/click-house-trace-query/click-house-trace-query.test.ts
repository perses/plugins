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

import { ClickHouseError } from '../../model/click-house-client';
import type { StubClient } from '../../test/stubs';
import { stubClient, stubDatasourceStore, stubResponse } from '../../test/stubs';
import { ClickHouseTraceQuery } from './ClickHouseTraceQuery';

function createContext(client: StubClient, variableState: TraceQueryContext['variableState'] = {}): TraceQueryContext {
  return {
    datasourceStore: stubDatasourceStore(client),
    variableState,
    absoluteTimeRange: {
      start: new Date('2026-01-01T10:00:00.000Z'),
      end: new Date('2026-01-01T11:00:00.000Z'),
    },
  };
}

const SPANS = stubResponse(
  [
    ['Timestamp', 'DateTime64(9)'],
    ['TraceId', 'String'],
    ['SpanId', 'String'],
    ['Duration', 'UInt64'],
  ],
  [['2026-01-01T10:00:00Z', '0000000000000000000000000000abcd', 'aaaa000000000001', '1000']],
);

const MATCHES = stubResponse(
  [
    ['TraceId', 'String'],
    ['FirstMatch', 'DateTime64(9)'],
    ['LastMatch', 'DateTime64(9)'],
  ],
  [
    ['t2', '2026-01-01T10:20:00Z', '2026-01-01T10:20:05Z'],
    ['t1', '2026-01-01T10:10:00Z', '2026-01-01T10:10:01Z'],
    ['t0', '2026-01-01T10:05:00Z', '2026-01-01T10:05:00Z'],
  ],
);

const SUMMARIES = stubResponse(
  [
    ['TraceId', 'String'],
    ['StartUnixNano', 'String'],
    ['EndUnixNano', 'String'],
    ['RootServiceName', 'LowCardinality(String)'],
    ['RootSpanName', 'LowCardinality(String)'],
    ['RootSpans', 'UInt64'],
    ['FirstServiceName', 'LowCardinality(String)'],
    ['FirstSpanName', 'LowCardinality(String)'],
    ['SpanCounts', 'Map(String, UInt64)'],
    ['ErrorCounts', 'Map(String, UInt64)'],
  ],
  [
    [
      't2',
      '1767262800000000000',
      '1767262802500000000',
      'frontend',
      'GET /cart',
      '1',
      'frontend',
      'GET /cart',
      { frontend: '3', db: '2' },
      { frontend: '0', db: '1' },
    ],
    // The root span of this trace is missing.
    ['t1', '1767262200000000000', '1767262200001000000', '', '', '0', 'db', 'SELECT', { db: '1' }, { db: '0' }],
  ],
);

describe('ClickHouseTraceQuery', () => {
  it('reads the trace whose ID is the query, from the table of the query', async () => {
    const client = stubClient(() => SPANS);

    const response = await ClickHouseTraceQuery.getTraceData(
      { query: ' ABCD ', table: 'otel.otel_traces' },
      createContext(client),
    );

    // IDs are stored as 32 lower case hexadecimal digits. The trace is not looked for in the time range only.
    const statement =
      "SELECT * FROM `otel`.`otel_traces` WHERE TraceId = '0000000000000000000000000000abcd' ORDER BY Timestamp";
    expect(client.statements()).toEqual([statement]);
    expect(response.metadata?.executedQueryString).toBe(statement);
    expect(response.trace?.resourceSpans[0]?.scopeSpans[0]?.spans[0]?.spanId).toBe('aaaa000000000001');
    expect(response.searchResult).toBeUndefined();
  });

  it('reads the trace whose ID is the value of a variable', async () => {
    const client = stubClient(() => SPANS);

    const response = await ClickHouseTraceQuery.getTraceData(
      { query: '$traceId' },
      createContext(client, { traceId: { value: '0000000000000000000000000000abcd', loading: false } }),
    );

    expect(response.trace).toBeDefined();
    // Nothing to display before the variable has a value.
    await expect(
      ClickHouseTraceQuery.getTraceData(
        { query: '$traceId' },
        createContext(client, { traceId: { value: '', loading: false } }),
      ),
    ).resolves.toEqual({});
  });

  it('fails when the trace does not exist', async () => {
    const client = stubClient(() => stubResponse([['Timestamp', 'DateTime64(9)']]));

    await expect(ClickHouseTraceQuery.getTraceData({ query: 'abcd' }, createContext(client))).rejects.toThrow(
      'Trace 0000000000000000000000000000abcd was not found in otel_traces.',
    );
  });

  it('searches the traces of the spans returned by a query, then summarizes them from all their spans', async () => {
    const client = stubClient((sql) => (sql.includes('FirstMatch') ? MATCHES : SUMMARIES));

    const response = await ClickHouseTraceQuery.getTraceData(
      {
        query: "SELECT TraceId, Timestamp FROM otel_traces WHERE $__timeFilter(Timestamp) AND StatusCode = 'Error'",
        limit: 2,
      },
      createContext(client),
    );

    const [matchStatement = '', summaryStatement = ''] = client.statements();
    expect(matchStatement).toBe(
      [
        'SELECT TraceId, min(Timestamp) AS FirstMatch, max(Timestamp) AS LastMatch',
        "FROM (\nSELECT TraceId, Timestamp FROM otel_traces WHERE (Timestamp >= toDateTime(1767261600) AND Timestamp <= toDateTime(1767265200)) AND StatusCode = 'Error'\n)",
        "WHERE TraceId != ''",
        'GROUP BY TraceId',
        'ORDER BY LastMatch DESC',
        // One more than the limit, to know whether more traces match.
        'LIMIT 3',
      ].join('\n'),
    );
    // Only the traces within the limit, looked for an hour around the matched spans.
    expect(summaryStatement).toContain("WHERE TraceId IN ('t2', 't1')");
    expect(summaryStatement).toContain('Timestamp >= fromUnixTimestamp64Milli(1767258600000)');
    expect(summaryStatement).toContain('Timestamp <= fromUnixTimestamp64Milli(1767266405000)');
    expect(summaryStatement).toContain('FROM `otel_traces`');

    expect(response.searchResult).toEqual([
      {
        traceId: 't2',
        rootServiceName: 'frontend',
        rootTraceName: 'GET /cart',
        startTimeUnixMs: 1767262800000,
        durationMs: 2500,
        serviceStats: { frontend: { spanCount: 3 }, db: { spanCount: 2, errorCount: 1 } },
      },
      {
        traceId: 't1',
        // Named after its first span, as its root span is missing.
        rootServiceName: 'db',
        rootTraceName: 'SELECT',
        startTimeUnixMs: 1767262200000,
        durationMs: 1,
        serviceStats: { db: { spanCount: 1 } },
      },
    ]);
    expect(response.metadata?.hasMoreResults).toBe(true);
    expect(response.metadata?.notices?.[0]?.type).toBe('info');
  });

  it('does not summarize when the search matches nothing', async () => {
    const client = stubClient(() => stubResponse(MATCHES.columns.map(({ name, type }) => [name, type])));

    const response = await ClickHouseTraceQuery.getTraceData(
      { query: 'SELECT TraceId, Timestamp FROM otel_traces' },
      createContext(client),
    );

    expect(response.searchResult).toEqual([]);
    expect(client.statements()).toHaveLength(1);
  });

  it('tells which columns a search query must return', async () => {
    const client = stubClient(() => {
      throw new ClickHouseError('ClickHouse query failed: Unknown expression identifier `TraceId`', { code: 47 });
    });

    await expect(
      ClickHouseTraceQuery.getTraceData({ query: 'SELECT ServiceName FROM otel_traces' }, createContext(client)),
    ).rejects.toThrow(/must return the "TraceId" and "Timestamp" columns/);
  });

  it('lists nothing for an empty query', async () => {
    const client = stubClient(() => SPANS);

    await expect(ClickHouseTraceQuery.getTraceData({ query: '' }, createContext(client))).resolves.toEqual({
      searchResult: [],
    });
    expect(client.statements()).toEqual([]);
  });
});
