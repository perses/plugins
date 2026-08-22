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

vi.mock('echarts/core');

import { TimeSeriesQueryContext } from '@perses-dev/plugin-system';
import { DatasourceSpec } from '@perses-dev/spec';
import type { Mock } from 'vitest';

import { VictoriaLogsDatasource } from '../../datasources/victorialogs-datasource';
import { VictoriaLogsDatasourceSpec } from '../../datasources/victorialogs-datasource/types';
import { VictoriaLogsStatsQueryRangeResponse } from '../../model/types';
import { VictoriaLogsTimeSeriesQuery } from './VictoriaLogsTimeSeriesQuery';

const datasource: VictoriaLogsDatasourceSpec = {
  directUrl: '/test',
};

const victorialogsStubClient = VictoriaLogsDatasource.createClient(datasource, {});

// Mock range query
victorialogsStubClient.statsQueryRange = vi.fn(async () => {
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

const getDatasourceClient: Mock = vi.fn(() => {
  return victorialogsStubClient;
});

const getDatasource: Mock = vi.fn((): DatasourceSpec<VictoriaLogsDatasourceSpec> => {
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
      listDatasourceSelectItems: vi.fn(),
      getLocalDatasources: vi.fn(),
      setLocalDatasources: vi.fn(),
      getSavedDatasources: vi.fn(),
      setSavedDatasources: vi.fn(),
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
      createStubContext(),
    );
    expect(variables).toEqual(['service', 'instance']);
  });

  it('should create initial options with empty query', () => {
    const initialOptions = VictoriaLogsTimeSeriesQuery.createInitialOptions();
    expect(initialOptions).toEqual({ query: '' });
  });
});
