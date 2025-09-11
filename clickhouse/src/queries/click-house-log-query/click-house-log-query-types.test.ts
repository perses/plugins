// Copyright 2025 The Perses Authors
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

import { ClickHouseDatasource, ClickHouseDatasourceSpec } from '../../datasources/click-house-datasource';
import { ClickHouseQueryResponse } from '../../model/click-house-client';
import { ClickHouseQueryContext } from './log-query-plugin-interface';
import { ClickHouseLogQuery } from './ClickHouseLogQuery';

const datasource: ClickHouseDatasourceSpec = {
  directUrl: '/test',
};

const clickhouseStubClient = ClickHouseDatasource.createClient(datasource, {});

// Mock query
clickhouseStubClient.query = jest.fn(async () => {
  const stubResponse: ClickHouseQueryResponse = {
    status: 'success',
    data: [],
  };
  return stubResponse as ClickHouseQueryResponse;
});

const getDatasourceClient: jest.Mock = jest.fn(() => {
  return clickhouseStubClient;
});

const createStubContext = (): ClickHouseQueryContext => {
  const stubLogContext: ClickHouseQueryContext = {
    datasourceStore: {
      getDatasource: jest.fn(),
      getDatasourceClient: getDatasourceClient,
      listDatasourceSelectItems: jest.fn(),
      getLocalDatasources: jest.fn(),
      setLocalDatasources: jest.fn(),
      getSavedDatasources: jest.fn(),
      setSavedDatasources: jest.fn(),
    },
    refreshKey: 'test',
    timeRange: {
      end: new Date('01-01-2025'),
      start: new Date('01-02-2025'),
    },
    variableState: {},
  };
  return stubLogContext;
};

describe('ClickHouseLogQuery', () => {
  it('should properly resolve variable dependencies', () => {
    if (!ClickHouseLogQuery.dependsOn) throw new Error('dependsOn is not defined');
    const { variables } = ClickHouseLogQuery.dependsOn(
      {
        query: '"SELECT * FROM otel_logs WHERE foo="$foo" AND bar="$bar"',
      },
      createStubContext()
    );
    expect(variables).toEqual(['foo', 'bar']);
  });

  it('should create initial options with empty query', () => {
    const initialOptions = ClickHouseLogQuery.createInitialOptions();
    expect(initialOptions).toEqual({ query: '' });
  });
});
