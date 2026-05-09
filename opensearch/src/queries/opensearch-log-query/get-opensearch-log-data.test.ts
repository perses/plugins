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

import { OpenSearchDatasource } from '../../datasources/opensearch-datasource';
import { OpenSearchDatasourceSpec } from '../../datasources/opensearch-datasource/opensearch-datasource-types';
import { OpenSearchPPLResponse } from '../../model/opensearch-client-types';
import { OpenSearchLogQuery } from './OpenSearchLogQuery';
import { LogQueryContext } from './log-query-plugin-interface';
import { buildBoundedPPL, convertPPLToLogs } from './get-opensearch-log-data';

const datasource: OpenSearchDatasourceSpec = {
  directUrl: '/test',
};

const stubClient = OpenSearchDatasource.createClient(datasource, {});

stubClient.ppl = jest.fn(async () => {
  const response: OpenSearchPPLResponse = {
    schema: [
      { name: '@timestamp', type: 'timestamp' },
      { name: 'message', type: 'text' },
      { name: 'level', type: 'keyword' },
    ],
    datarows: [
      ['2025-01-01T00:00:00.000Z', 'Error processing request', 'error'],
      ['2025-01-01T00:00:01.000Z', 'Retrying', 'warn'],
    ],
    total: 2,
    size: 2,
  };
  return response;
});

const getDatasourceClient: jest.Mock = jest.fn(() => stubClient);

function createStubContext(): LogQueryContext {
  return {
    datasourceStore: {
      getDatasource: jest.fn(),
      getDatasourceClient,
      listDatasourceSelectItems: jest.fn(),
      getLocalDatasources: jest.fn(),
      setLocalDatasources: jest.fn(),
      getSavedDatasources: jest.fn(),
      setSavedDatasources: jest.fn(),
    },
    timeRange: {
      start: new Date('2025-01-01T00:00:00.000Z'),
      end: new Date('2025-01-01T01:00:00.000Z'),
    },
    variableState: {},
  };
}

describe('OpenSearchLogQuery', () => {
  afterEach(() => {
    (stubClient.ppl as jest.Mock).mockClear();
  });

  it('creates initial options with empty query', () => {
    expect(OpenSearchLogQuery.createInitialOptions()).toEqual({ query: '' });
  });

  it('resolves variable dependencies from query and index', () => {
    if (!OpenSearchLogQuery.dependsOn) throw new Error('dependsOn is not defined');
    const { variables } = OpenSearchLogQuery.dependsOn(
      {
        query: 'source=$index | where service="$service" and level="$level"',
        index: '$index',
      },
      createStubContext()
    );
    expect(variables?.sort()).toEqual(['index', 'level', 'service']);
  });

  it('returns empty log data for an empty query without calling the client', async () => {
    const result = await OpenSearchLogQuery.getLogData({ query: '' }, createStubContext());
    expect(result.logs.entries).toEqual([]);
    expect(result.logs.totalCount).toBe(0);
    expect(stubClient.ppl).not.toHaveBeenCalled();
  });

  it('reports traceId in dependsOn when query references $traceId', () => {
    if (!OpenSearchLogQuery.dependsOn) throw new Error('dependsOn is not defined');
    const { variables } = OpenSearchLogQuery.dependsOn(
      { query: "source=logs-* | where traceId='$traceId'" },
      createStubContext()
    );
    expect(variables).toContain('traceId');
  });

  it('passes timestampField + messageField through to the bounder and mapper', async () => {
    const pplMock = stubClient.ppl as jest.Mock;
    pplMock.mockImplementationOnce(async () => ({
      schema: [
        { name: 'time', type: 'timestamp' },
        { name: 'body', type: 'text' },
      ],
      datarows: [['2025-01-01T00:00:30.000Z', 'OTel-style row']],
    }));

    const result = await OpenSearchLogQuery.getLogData(
      {
        query: 'source=otel-logs-* | head 1',
        timestampField: 'time',
        messageField: 'body',
      },
      createStubContext()
    );

    const sentQuery = pplMock.mock.calls[0]?.[0]?.query as string;
    expect(sentQuery).toContain('`time` >=');
    expect(result.logs.entries[0]?.line).toBe('OTel-style row');
  });

  it('substitutes a $traceId variable into the PPL before sending', async () => {
    const pplMock = stubClient.ppl as jest.Mock;
    pplMock.mockImplementationOnce(async () => ({ schema: [], datarows: [] }));

    await OpenSearchLogQuery.getLogData(
      { query: "source=logs-* | where traceId='$traceId'" },
      {
        ...createStubContext(),
        variableState: {
          traceId: { value: 'abc123', loading: false },
        } as unknown as LogQueryContext['variableState'],
      }
    );

    const sentQuery = pplMock.mock.calls[0]?.[0]?.query as string;
    expect(sentQuery).toContain("where traceId='abc123'");
  });

  it('executes a PPL query and maps rows to log entries', async () => {
    const result = await OpenSearchLogQuery.getLogData(
      { query: 'source=logs-* | where level="error"' },
      createStubContext()
    );

    expect(stubClient.ppl).toHaveBeenCalledTimes(1);
    expect(result.logs.totalCount).toBe(2);
    expect(result.logs.entries[0]).toEqual({
      timestamp: new Date('2025-01-01T00:00:00.000Z').getTime() / 1000,
      line: 'Error processing request',
      labels: { level: 'error' },
    });
    expect(result.metadata?.executedQueryString).toContain('where level="error"');
  });
});

describe('buildBoundedPPL', () => {
  const start = new Date('2025-01-01T00:00:00.000Z');
  const end = new Date('2025-01-01T01:00:00.000Z');

  it('injects the time-range filter immediately after the source clause', () => {
    const q = buildBoundedPPL('source=logs-* | where level="error"', start, end);
    expect(q).toBe(
      "source=logs-* | where `@timestamp` >= '2025-01-01T00:00:00.000Z' and `@timestamp` <= '2025-01-01T01:00:00.000Z' | where level=\"error\""
    );
  });

  it('prepends source=<index> when the user query does not declare one', () => {
    const q = buildBoundedPPL('where level="error"', start, end, 'logs-*');
    expect(q).toBe(
      "source=logs-* | where `@timestamp` >= '2025-01-01T00:00:00.000Z' and `@timestamp` <= '2025-01-01T01:00:00.000Z' | where level=\"error\""
    );
  });

  it('leaves the user source clause alone when already present and ignores the spec.index hint', () => {
    const q = buildBoundedPPL('source=other-* | head 10', start, end, 'logs-*');
    expect(q).toBe(
      "source=other-* | where `@timestamp` >= '2025-01-01T00:00:00.000Z' and `@timestamp` <= '2025-01-01T01:00:00.000Z' | head 10"
    );
  });

  it('uses a custom timestamp field name in the injected where clause', () => {
    const q = buildBoundedPPL('source=logs-* | head 10', start, end, undefined, 'time');
    expect(q).toBe(
      "source=logs-* | where `time` >= '2025-01-01T00:00:00.000Z' and `time` <= '2025-01-01T01:00:00.000Z' | head 10"
    );
  });

  it('runs the bound BEFORE a stats command (otherwise @timestamp is gone)', () => {
    const q = buildBoundedPPL('source=logs-* | stats count() by service', start, end);
    expect(q).toBe(
      "source=logs-* | where `@timestamp` >= '2025-01-01T00:00:00.000Z' and `@timestamp` <= '2025-01-01T01:00:00.000Z' | stats count() by service"
    );
  });

  it('runs the bound BEFORE a fields command that excludes @timestamp', () => {
    const q = buildBoundedPPL('source=logs-* | fields service, body', start, end);
    expect(q).toBe(
      "source=logs-* | where `@timestamp` >= '2025-01-01T00:00:00.000Z' and `@timestamp` <= '2025-01-01T01:00:00.000Z' | fields service, body"
    );
  });

  it('runs the bound BEFORE a top command (which collapses to top-N rows without @timestamp)', () => {
    const q = buildBoundedPPL('source=logs-* | top 3 service', start, end);
    expect(q).toBe(
      "source=logs-* | where `@timestamp` >= '2025-01-01T00:00:00.000Z' and `@timestamp` <= '2025-01-01T01:00:00.000Z' | top 3 service"
    );
  });

  it('appends a single where pipe when the user query has no other pipes', () => {
    const q = buildBoundedPPL('source=logs-*', start, end);
    expect(q).toBe(
      "source=logs-* | where `@timestamp` >= '2025-01-01T00:00:00.000Z' and `@timestamp` <= '2025-01-01T01:00:00.000Z'"
    );
  });
});

describe('convertPPLToLogs', () => {
  it('maps @timestamp and message fields and collects remaining fields as labels', () => {
    const logs = convertPPLToLogs({
      schema: [
        { name: '@timestamp', type: 'timestamp' },
        { name: 'message', type: 'text' },
        { name: 'service', type: 'keyword' },
      ],
      datarows: [['2025-01-01T00:00:00.000Z', 'hello', 'api']],
    });
    expect(logs.entries).toHaveLength(1);
    expect(logs.entries[0]?.line).toBe('hello');
    expect(logs.entries[0]?.labels).toEqual({ service: 'api' });
  });

  it('parses numeric epoch-millis timestamps into seconds', () => {
    const logs = convertPPLToLogs({
      schema: [
        { name: '@timestamp', type: 'long' },
        { name: 'message', type: 'text' },
      ],
      datarows: [[1735689600000, 'hello']],
    });
    expect(logs.entries[0]?.timestamp).toBe(1735689600);
  });

  it('falls back to a JSON dump of the row when no message field is present', () => {
    const logs = convertPPLToLogs({
      schema: [
        { name: '@timestamp', type: 'timestamp' },
        { name: 'event', type: 'text' },
      ],
      datarows: [['2025-01-01T00:00:00.000Z', 'started']],
    });
    expect(logs.entries[0]?.line).toContain('"event":"started"');
  });

  it('handles empty datarows', () => {
    const logs = convertPPLToLogs({ schema: [], datarows: [] });
    expect(logs).toEqual({ entries: [], totalCount: 0 });
  });

  it('honors explicit timestampField and messageField overrides', () => {
    const logs = convertPPLToLogs(
      {
        schema: [
          { name: 'time', type: 'timestamp' },
          { name: 'body', type: 'text' },
          { name: 'message', type: 'text' },
        ],
        datarows: [['2025-01-01T00:00:00.000Z', 'OTel body wins', 'noise']],
      },
      { timestampField: 'time', messageField: 'body' }
    );
    expect(logs.entries[0]?.line).toBe('OTel body wins');
    expect(logs.entries[0]?.labels).toEqual({ message: 'noise' });
    expect(logs.entries[0]?.timestamp).toBe(new Date('2025-01-01T00:00:00.000Z').getTime() / 1000);
  });

  it('falls back to defaults when the override field is not in the schema', () => {
    const logs = convertPPLToLogs(
      {
        schema: [
          { name: '@timestamp', type: 'timestamp' },
          { name: 'message', type: 'text' },
        ],
        datarows: [['2025-01-01T00:00:00.000Z', 'hello']],
      },
      { timestampField: 'nope', messageField: 'also-missing' }
    );
    expect(logs.entries[0]?.line).toBe('hello');
  });

  it('puts trace_id columns into labels for trace pivot', () => {
    const logs = convertPPLToLogs({
      schema: [
        { name: '@timestamp', type: 'timestamp' },
        { name: 'message', type: 'text' },
        { name: 'traceId', type: 'keyword' },
      ],
      datarows: [['2025-01-01T00:00:00.000Z', 'hello', 'abc123']],
    });
    expect(logs.entries[0]?.labels.traceId).toBe('abc123');
  });
});
