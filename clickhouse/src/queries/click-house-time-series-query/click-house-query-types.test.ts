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

// TODO: This should be fixed globally in the test setup
import { DatasourceSpec } from '@perses-dev/core';

jest.mock('echarts/core');

import { TimeSeriesQueryContext } from '@perses-dev/plugin-system';
import { ClickHouseDatasource, ClickHouseDatasourceSpec } from '../../datasources';
import { ClickHouseQueryResponse } from '../../model/click-house-client';
import { ClickHouseTimeSeriesQuery } from './ClickHouseQuery';

const datasource: ClickHouseDatasourceSpec = {
  directUrl: '/test',
};

const clickhouseStubClient = ClickHouseDatasource.createClient(datasource, {});

// Mock query to only return ClickHouse "data"
clickhouseStubClient.query = jest.fn(async () => {
  const stubResponse: ClickHouseQueryResponse = {
    status: 'success',
    data: [
      { time: '2025-09-09 05:18:00', log_count: '277' },
      { time: '2025-09-09 05:19:00', log_count: '156102' },
    ],
  };
  return stubResponse as ClickHouseQueryResponse;
});

const getDatasourceClient: jest.Mock = jest.fn(() => {
  return clickhouseStubClient;
});

const getDatasource: jest.Mock = jest.fn((): DatasourceSpec<ClickHouseDatasourceSpec> => {
  return {
    default: false,
    plugin: {
      kind: 'ClickHouseDatasource',
      spec: datasource,
    },
  };
});

const createStubContext = (): TimeSeriesQueryContext => {
  const stubTimeSeriesContext: TimeSeriesQueryContext = {
    datasourceStore: {
      getDatasource: getDatasource,
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
  return stubTimeSeriesContext;
};

describe('ClickHouseTimeSeriesQuery', () => {
  it('should properly resolve variable dependencies', () => {
    if (!ClickHouseTimeSeriesQuery.dependsOn) throw new Error('dependsOn is not defined');
    const { variables } = ClickHouseTimeSeriesQuery.dependsOn(
      {
        query: '"SELECT * FROM otel_logs WHERE foo="$foo" AND bar="$bar"',
      },
      createStubContext()
    );
    expect(variables).toEqual(['foo', 'bar']);
  });

  it('should create initial options with empty query', () => {
    const initialOptions = ClickHouseTimeSeriesQuery.createInitialOptions();
    expect(initialOptions).toEqual({ query: '' });
  });

  it('should run query and return ClickHouse data only', async () => {
    const client = getDatasourceClient();
    const resp = await client.query('SELECT count(*) FROM otel_logs');
    expect(resp.data.length).toBeGreaterThan(0);
    expect(resp.data[0]).toHaveProperty('time');
    expect(resp.data[0]).toHaveProperty('log_count');
  });
});
