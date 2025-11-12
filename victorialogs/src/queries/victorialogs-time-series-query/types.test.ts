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
import { VictoriaLogsStatsQueryRangeResponse } from '../../model/types';
import { VictoriaLogsDatasource } from '../../datasources/victorialogs-datasource';
import { VictoriaLogsDatasourceSpec } from '../../datasources/victorialogs-datasource/types';
import { VictoriaLogsTimeSeriesQuery } from './VictoriaLogsTimeSeriesQuery';

const datasource: VictoriaLogsDatasourceSpec = {
  directUrl: '/test',
};

const victorialogsStubClient = VictoriaLogsDatasource.createClient(datasource, {});

// Mock range query
victorialogsStubClient.statsQueryRange = jest.fn(async () => {
  return {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: {
            __name__: 'victorialogs_up',
            service: 'api',
          },
          values: [[1686141338.877, '10']],
        },
      ],
    },
  } as VictoriaLogsStatsQueryRangeResponse;
});

const getDatasourceClient: jest.Mock = jest.fn(() => {
  return victorialogsStubClient;
});

const getDatasource: jest.Mock = jest.fn((): DatasourceSpec<VictoriaLogsDatasourceSpec> => {
  return {
    default: false,
    plugin: {
      kind: 'VictoriaLogsDatasource',
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

describe('VictoriaLogsTimeSeriesQuery', () => {
  it('should properly resolve variable dependencies', () => {
    if (!VictoriaLogsTimeSeriesQuery.dependsOn) throw new Error('dependsOn is not defined');
    const { variables } = VictoriaLogsTimeSeriesQuery.dependsOn(
      {
        query: 'rate({service="$service", instance="$instance"}[5m])',
      },
      createStubContext()
    );
    expect(variables).toEqual(['service', 'instance']);
  });

  it('should create initial options with empty query', () => {
    const initialOptions = VictoriaLogsTimeSeriesQuery.createInitialOptions();
    expect(initialOptions).toEqual({ query: '' });
  });
});
