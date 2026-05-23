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

import { GreptimeDBDatasource, GreptimeDBDatasourceSpec } from '../../datasources';
import { GreptimeDBQueryResponse } from '../../model/greptimedb-client';
import { GreptimeDBLogQuery } from './GreptimeDBLogQuery';
import { GreptimeDBQueryContext } from './log-query-plugin-interface';

const datasource: GreptimeDBDatasourceSpec = {
  directUrl: '/test',
};

const greptimedbStubClient = GreptimeDBDatasource.createClient(datasource, {});

const mockedQuery = jest.fn();
greptimedbStubClient.query = mockedQuery;

const getDatasourceClient: jest.Mock = jest.fn(() => {
  return greptimedbStubClient;
});

const createStubContext = (): GreptimeDBQueryContext => {
  const stubLogContext: Partial<GreptimeDBQueryContext> = {
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
    timeRange: {
      start: new Date('2025-01-01T00:00:00.000Z'),
      end: new Date('2025-01-02T00:00:00.000Z'),
    },
    variableState: {},
  };
  return stubLogContext as GreptimeDBQueryContext;
};

describe('GreptimeDBLogQuery', () => {
  beforeEach(() => {
    mockedQuery.mockReset();
    getDatasourceClient.mockClear();
  });

  it('should properly resolve variable dependencies', () => {
    if (!GreptimeDBLogQuery.dependsOn) throw new Error('dependsOn is not defined');
    const { variables } = GreptimeDBLogQuery.dependsOn(
      {
        query: 'SELECT * FROM logs WHERE foo="$foo" AND bar="$bar"',
      },
      createStubContext()
    );
    expect(variables).toEqual(['foo', 'bar']);
  });

  it('should create initial options with query', () => {
    const initialOptions = GreptimeDBLogQuery.createInitialOptions();
    expect(initialOptions).toEqual({ query: '' });
  });

  it('should map GreptimeDB records into log entries', async () => {
    mockedQuery.mockResolvedValue({
      status: 'success',
      data: {
        output: [
          {
            records: {
              schema: {
                column_schemas: [
                  { name: 'ts', data_type: 'TimestampMillisecond' },
                  { name: 'message' },
                  { name: 'level' },
                ],
              },
              rows: [
                [1700000000000, 'hello', 'info'],
                [1700000001000, null, ''],
              ],
            },
          },
        ],
      },
    } as GreptimeDBQueryResponse);

    const result = await GreptimeDBLogQuery.getLogData(
      {
        query: 'SELECT * FROM logs',
      },
      createStubContext()
    );

    expect(result.logs.totalCount).toBe(2);
    expect(result.logs.entries).toHaveLength(2);
    expect(result.logs.entries[0]).toEqual({
      timestamp: 1700000000,
      labels: {
        message: 'hello',
        level: 'info',
      },
      line: 'message=hello level=info',
    });
    expect(result.logs.entries[1]).toEqual({
      timestamp: 1700000001,
      labels: {
        message: '',
        level: '',
      },
      line: 'message=-- level=--',
    });
  });
});
