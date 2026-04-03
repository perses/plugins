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

// TODO: This should be fixed globally in the test setup
import { DatasourceSpec } from '@perses-dev/core';

jest.mock('echarts/core');

import { GreptimeDBDatasource, GreptimeDBDatasourceSpec } from '../../datasources';
import { GreptimeDBQueryResponse } from '../../model/greptimedb-client';
import { GreptimeDBLogQuery } from './GreptimeDBLogQuery';
import { GreptimeDBQueryContext } from './log-query-plugin-interface';

const datasource: GreptimeDBDatasourceSpec = {
  directUrl: '/test',
};

const greptimedbStubClient = GreptimeDBDatasource.createClient(datasource, {});

greptimedbStubClient.query = jest.fn(async () => {
  const stubResponse: GreptimeDBQueryResponse = {
    status: 'success',
    data: {
      schema: {
        column_schemas: [{ name: 'ts' }, { name: 'message' }],
      },
      rows: [[1700000000000, 'hello']],
    },
  };
  return stubResponse as GreptimeDBQueryResponse;
});

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
      end: new Date('01-01-2025'),
      start: new Date('01-02-2025'),
    },
    variableState: {},
  };
  return stubLogContext as GreptimeDBQueryContext;
};

describe('GreptimeDBLogQuery', () => {
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

  it('should run query and return GreptimeDB records', async () => {
    const client = getDatasourceClient();
    const resp = await client.query({ query: 'SELECT * FROM logs' });
    expect(resp.data).toHaveProperty('rows');
  });
});
