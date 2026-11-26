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

import type { StubClient } from '../../test/stubs';
import { stubClient, stubDatasourceStore, stubResponse } from '../../test/stubs';
import { ClickHouseLogQuery } from './ClickHouseLogQuery';

function createContext(client: StubClient): LogQueryContext {
  return {
    datasourceStore: stubDatasourceStore(client),
    timeRange: {
      start: new Date('2025-01-01T00:00:00.000Z'),
      end: new Date('2025-01-02T00:00:00.000Z'),
    },
    variableState: {},
    refreshKey: '',
  };
}

const NO_LOGS = stubResponse([
  ['Timestamp', 'DateTime64(9)'],
  ['Body', 'String'],
]);

describe('ClickHouseLogQuery', () => {
  it('should properly resolve variable dependencies', () => {
    if (!ClickHouseLogQuery.dependsOn) throw new Error('dependsOn is not defined');
    const { variables } = ClickHouseLogQuery.dependsOn(
      {
        query: '"SELECT * FROM otel_logs WHERE foo="$foo" AND bar="$bar"',
      },
      createContext(stubClient(() => NO_LOGS)),
    );
    expect(variables).toEqual(['foo', 'bar']);
  });

  it('should create initial options with empty query', () => {
    const initialOptions = ClickHouseLogQuery.createInitialOptions();
    expect(initialOptions).toEqual({ query: '' });
  });

  it('should run query with interpolated time range', async () => {
    const client = stubClient(() => NO_LOGS);

    const response = await ClickHouseLogQuery.getLogData(
      {
        query: "SELECT * FROM application_logs WHERE timestamp >= '{start}' AND timestamp <= '{end}'",
      },
      createContext(client),
    );

    const executed =
      "SELECT * FROM application_logs WHERE timestamp >= '2025-01-01 00:00:00' AND timestamp <= '2025-01-02 00:00:00'";
    expect(client.statements()).toEqual([executed]);
    expect(response.metadata?.executedQueryString).toBe(executed);
  });

  it('should read the rows of the OpenTelemetry logs table as logs', async () => {
    const client = stubClient(() =>
      stubResponse(
        [
          ['Timestamp', 'DateTime64(9)'],
          ['TraceId', 'String'],
          ['SeverityText', 'LowCardinality(String)'],
          ['SeverityNumber', 'UInt8'],
          ['ServiceName', 'LowCardinality(String)'],
          ['Body', 'String'],
          ['LogAttributes', 'Map(LowCardinality(String), String)'],
        ],
        [
          ['2025-01-01T10:00:00.250000000Z', 'abc', 'ERROR', 17, 'checkout', 'payment failed', { 'app.user': '42' }],
          // An event: no line, no severity text.
          ['2025-01-01T10:00:01Z', '', '', 9, 'db', '', { 'event.name': 'query' }],
        ],
        { statistics: { rowsRead: 100, bytesRead: 2048, elapsedMs: 3 } },
      ),
    );

    const response = await ClickHouseLogQuery.getLogData({ query: 'SELECT * FROM otel_logs' }, createContext(client));

    expect(response.logs).toEqual({
      totalCount: 2,
      entries: [
        {
          // In seconds.
          timestamp: Date.UTC(2025, 0, 1, 10) / 1000 + 0.25,
          line: 'payment failed',
          labels: {
            TraceId: 'abc',
            SeverityText: 'ERROR',
            SeverityNumber: '17',
            ServiceName: 'checkout',
            'LogAttributes.app.user': '42',
            level: 'ERROR',
          },
        },
        {
          timestamp: Date.UTC(2025, 0, 1, 10, 0, 1) / 1000,
          // Without a line, a log is described by its labels.
          line: '<LogAttributes.event.name> query <ServiceName> db <SeverityNumber> 9 <level> info',
          // Empty values are left out, and the level comes from the severity number.
          labels: { SeverityNumber: '9', ServiceName: 'db', 'LogAttributes.event.name': 'query', level: 'info' },
        },
      ],
      metadata: { stats: { linesExamined: 100, bytesExamined: 2048, executionTimeMs: 3 } },
    });
  });

  it('should warn when the logs have no time column', async () => {
    const client = stubClient(() => stubResponse([['Body', 'String']], [['hello']]));

    const response = await ClickHouseLogQuery.getLogData({ query: 'SELECT Body FROM t' }, createContext(client));

    expect(response.logs?.entries).toEqual([]);
    expect(response.logs?.metadata?.notices?.[0]?.message).toMatch(/returns no time column/);
  });

  it('should create the volume query of a log query', () => {
    const context = createContext(stubClient(() => NO_LOGS));
    const datasource = { kind: 'ClickHouseDatasource', name: 'logs' } as const;

    expect(
      ClickHouseLogQuery.createVolumeQuery?.(
        { datasource, query: 'SELECT Timestamp, Body FROM otel_logs ORDER BY Timestamp DESC LIMIT 100' },
        context,
      ),
    ).toEqual({
      kind: 'TimeSeriesQuery',
      spec: {
        plugin: {
          kind: 'ClickHouseTimeSeriesQuery',
          spec: {
            datasource,
            query: [
              'SELECT $__timeInterval(`Timestamp`) AS time, count() AS logs',
              'FROM (\nSELECT Timestamp, Body FROM otel_logs\n)',
              'GROUP BY time',
              'ORDER BY time',
            ].join('\n'),
            seriesNameFormat: '{{level}}',
          },
        },
      },
    });
    expect(ClickHouseLogQuery.createVolumeQuery?.({ query: '' }, context)).toBeNull();
  });
});
