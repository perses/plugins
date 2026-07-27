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

jest.mock('echarts/core');

import { TimeSeriesQueryContext } from '@perses-dev/plugin-system';
import { DatasourceSpec } from '@perses-dev/spec';
import { LokiQueryRangeMatrixResponse, LokiQueryRangeResponse, LokiQueryResponse } from '../../model/loki-client-types';
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

// Mock instant query
lokiStubClient.query = jest.fn(async () => {
  const stubResponse: LokiQueryResponse = {
    status: 'success',
    data: {
      resultType: 'vector',
      result: [
        {
          metric: { __name__: 'loki_count', service: 'api' },
          value: [1686141338, '99'],
        },
      ],
    },
  };
  return stubResponse;
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

const createStubContext = (overrides?: Partial<TimeSeriesQueryContext>): TimeSeriesQueryContext => {
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
      end: new Date('2025-01-01T00:00:00Z'),
      start: new Date('2024-12-25T00:00:00Z'),
    },
    variableState: {},
    ...overrides,
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

  describe('instant mode', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should call client.query() with end time as unix seconds and return vector series', async () => {
      const context = createStubContext({ mode: 'instant' });
      const result = await LokiTimeSeriesQuery.getTimeSeriesData(
        { query: 'count_over_time({service="api"} [1h])' },
        context
      );

      expect(lokiStubClient.query).toHaveBeenCalledTimes(1);
      expect(lokiStubClient.queryRange).not.toHaveBeenCalled();
      const callArgs = (lokiStubClient.query as jest.Mock).mock.calls[0][0];
      expect(callArgs.time).toBe(Math.floor(context.timeRange.end.getTime() / 1000).toString());
      expect(result.series).toHaveLength(1);
      expect(result.series[0]?.values[0]?.[1]).toBe(99);
    });

    it('should return empty series with warning notice for streams resultType', async () => {
      (lokiStubClient.query as jest.Mock).mockResolvedValueOnce({
        status: 'success',
        data: {
          resultType: 'streams',
          result: [{ stream: { service: 'api' }, values: [['1686141338000000000', 'log line']] }],
        },
      } as LokiQueryResponse);

      const context = createStubContext({ mode: 'instant' });
      const result = await LokiTimeSeriesQuery.getTimeSeriesData({ query: '{service="api"}' }, context);

      expect(result.series).toHaveLength(0);
      expect(result.metadata?.notices?.[0]?.type).toBe('warning');
      expect(result.metadata?.notices?.[0]?.message).toBe("log streams are not supported in 'instant' mode");
    });
  });

  it('should use queryRange when mode is not set', async () => {
    jest.clearAllMocks();
    const context = createStubContext();
    await LokiTimeSeriesQuery.getTimeSeriesData({ query: 'count_over_time({service="api"} [1h])' }, context);

    expect(lokiStubClient.queryRange).toHaveBeenCalledTimes(1);
    expect(lokiStubClient.query).not.toHaveBeenCalled();
  });
});
