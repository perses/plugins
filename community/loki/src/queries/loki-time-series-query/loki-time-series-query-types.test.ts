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
import { LokiQueryRangeMatrixResponse, LokiQueryRangeResponse } from '../../model/loki-client-types';
import { LokiDatasource } from '../../datasources/loki-datasource';
import { LokiDatasourceSpec } from '../../datasources/loki-datasource/loki-datasource-types';
import { LokiTimeSeriesQuery } from './LokiTimeSeriesQuery';

const datasource: LokiDatasourceSpec = {
  directUrl: '/test',
};

const lokiStubClient = LokiDatasource.createClient(datasource, {});

// Mock range query
lokiStubClient.queryRange = jest.fn(async () => {
  const stubResponse: LokiQueryRangeMatrixResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: {
            __name__: 'loki_up',
            service: 'api',
          },
          values: [[1686141338.877, '10']],
        },
      ],
    },
  };
  return stubResponse as LokiQueryRangeResponse;
});

const getDatasourceClient: jest.Mock = jest.fn(() => {
  return lokiStubClient;
});

const getDatasource: jest.Mock = jest.fn((): DatasourceSpec<LokiDatasourceSpec> => {
  return {
    default: false,
    plugin: {
      kind: 'LokiDatasource',
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

describe('LokiTimeSeriesQuery', () => {
  it('should properly resolve variable dependencies', () => {
    if (!LokiTimeSeriesQuery.dependsOn) throw new Error('dependsOn is not defined');
    const { variables } = LokiTimeSeriesQuery.dependsOn(
      {
        query: 'rate({service="$service", instance="$instance"}[5m])',
      },
      createStubContext()
    );
    expect(variables).toEqual(['service', 'instance']);
  });

  it('should create initial options with empty query', () => {
    const initialOptions = LokiTimeSeriesQuery.createInitialOptions();
    expect(initialOptions).toEqual({ query: '' });
  });
});
