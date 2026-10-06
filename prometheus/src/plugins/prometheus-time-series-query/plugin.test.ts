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

vi.mock('echarts/core');

import type { TimeSeriesQueryContext } from '@perses-dev/plugin-system';
import type { DatasourceSpec, DurationString } from '@perses-dev/spec';
import type { Mock } from 'vitest';

import type { RangeQueryResponse, InstantQueryResponse, QueryExemplarsResponse } from '../../model';
import { PrometheusDatasource } from '../prometheus-datasource';
import type { PrometheusDatasourceSpec } from '../types';
import { PrometheusTimeSeriesQuery } from './';

const datasource: PrometheusDatasourceSpec = {
  directUrl: '/test',
  scrapeInterval: '1m',
};

const promStubClient = PrometheusDatasource.createClient(datasource, {});

// Mock range query
promStubClient.rangeQuery = vi.fn(async () => {
  const stubRepsonse: RangeQueryResponse = {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [
        {
          metric: {
            __name__: 'up',
          },
          values: [[1686141338.877, '10']],
        },
      ],
    },
  };
  return stubRepsonse;
});

// Mock instant query
promStubClient.instantQuery = vi.fn(async () => {
  const stubResponse: InstantQueryResponse = {
    status: 'success',
    data: {
      resultType: 'vector',
      result: [
        {
          metric: {
            __name__: 'up',
          },
          value: [1686141338.877, '10'],
        },
      ],
    },
  };
  return stubResponse;
});

const getDatasourceClient: Mock = vi.fn(() => {
  return promStubClient;
});

const getDatasource: Mock = vi.fn((): DatasourceSpec<PrometheusDatasourceSpec> => {
  return {
    default: false,
    plugin: {
      kind: 'PrometheusDatasource',
      spec: datasource,
    },
  };
});

// Mock exemplars query
promStubClient.queryExemplars = vi.fn(async (): Promise<QueryExemplarsResponse> => {
  const stubResponse: QueryExemplarsResponse = {
    status: 'success',
    data: [
      {
        seriesLabels: {
          __name__: 'up',
          job: 'node',
        },
        exemplars: [
          {
            labels: {
              traceID: 'abc123',
            },
            value: '10',
            timestamp: 1686141338.877,
          },
        ],
      },
    ],
  };
  return stubResponse;
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
      end: new Date('01-01-2023'),
      start: new Date('01-02-2023'),
    },
    variableState: {},
  };
  return stubTimeSeriesContext;
};

describe('PrometheusTimeSeriesQuery', () => {
  it('should properly resolve variable dependencies', () => {
    if (!PrometheusTimeSeriesQuery.dependsOn) throw new Error('dependsOn is not defined');
    const { variables } = PrometheusTimeSeriesQuery.dependsOn(
      {
        query: 'sum(up{job="$job"}) by ($instance)',
        seriesNameFormat: `$foo - label`,
      },
      createStubContext(),
    );
    expect(variables).toEqual(['job', 'instance', 'foo']);
  });

  it('should replace variables in seriesNameFormat', async () => {
    const ctx = createStubContext();
    ctx.variableState = {
      foo: {
        value: 'bar',
        loading: false,
      },
    };

    const results = await PrometheusTimeSeriesQuery.getTimeSeriesData(
      {
        query: 'sum(up{job="$job"}) by ($instance)',
        seriesNameFormat: `$foo - format`,
      },
      ctx,
    );

    expect(results.series[0]?.formattedName).toEqual('bar - format');
  });

  it('should evaluate instant queries at the exact end of the time range, not the step-aligned end', async () => {
    const ctx = createStubContext();
    ctx.mode = 'instant';
    // An end that is not a multiple of the step, with a step large enough that
    // aligning the end to it would move the evaluation time by several minutes.
    ctx.timeRange = { start: new Date('2023-01-01T00:00:00Z'), end: new Date('2023-01-01T06:07:23Z') };
    ctx.suggestedStepMs = 30 * 60 * 1000;
    (promStubClient.instantQuery as Mock).mockClear();
    (promStubClient.rangeQuery as Mock).mockClear();

    await PrometheusTimeSeriesQuery.getTimeSeriesData({ query: 'up' }, ctx);

    expect(promStubClient.instantQuery).toHaveBeenCalledTimes(1);
    expect(promStubClient.rangeQuery).not.toHaveBeenCalled();
    const [params] = (promStubClient.instantQuery as Mock).mock.calls[0] as [{ query: string; time: number }];
    expect(params.time).toBe(Math.floor(ctx.timeRange.end.getTime() / 1000));
  });

  it('should use instantQuery when spec.instant is true', async () => {
    const ctx = createStubContext();
    (promStubClient.instantQuery as Mock).mockClear();
    (promStubClient.rangeQuery as Mock).mockClear();

    await PrometheusTimeSeriesQuery.getTimeSeriesData(
      {
        query: 'up',
        instant: true,
      },
      ctx,
    );

    expect(promStubClient.instantQuery).toHaveBeenCalledTimes(1);
    expect(promStubClient.rangeQuery).not.toHaveBeenCalled();
  });

  it('should use rangeQuery when spec.instant is false even if context mode is instant', async () => {
    const ctx = createStubContext();
    ctx.mode = 'instant';
    (promStubClient.instantQuery as Mock).mockClear();
    (promStubClient.rangeQuery as Mock).mockClear();

    await PrometheusTimeSeriesQuery.getTimeSeriesData(
      {
        query: 'up',
        instant: false,
      },
      ctx,
    );

    expect(promStubClient.rangeQuery).toHaveBeenCalledTimes(1);
    expect(promStubClient.instantQuery).not.toHaveBeenCalled();
  });

  it('should not query exemplars when the datasource does not enable them', async () => {
    const ctx = createStubContext();
    (promStubClient.rangeQuery as Mock).mockClear();
    (promStubClient.queryExemplars as Mock).mockClear();

    const results = await PrometheusTimeSeriesQuery.getTimeSeriesData({ query: 'up' }, ctx);

    expect(promStubClient.queryExemplars).not.toHaveBeenCalled();
    expect(results.exemplars).toBeUndefined();
  });

  it('should query exemplars and convert them when the datasource enables them', async () => {
    const ctx = createStubContext();
    getDatasource.mockImplementation((): DatasourceSpec<PrometheusDatasourceSpec> => {
      return {
        default: false,
        plugin: {
          kind: 'PrometheusDatasource',
          spec: {
            ...datasource,
            exemplars: { enable: true },
          },
        },
      };
    });
    (promStubClient.queryExemplars as Mock).mockClear();

    const results = await PrometheusTimeSeriesQuery.getTimeSeriesData({ query: 'up' }, ctx);

    expect(promStubClient.queryExemplars).toHaveBeenCalledTimes(1);
    expect(results.exemplars).toEqual([
      {
        seriesLabels: { job: 'node' },
        exemplars: [{ labels: { traceID: 'abc123' }, value: 10, timestamp: 1686141338877 }],
      },
    ]);
  });

  it('should keep the query working when the exemplar query fails', async () => {
    const ctx = createStubContext();
    getDatasource.mockImplementation((): DatasourceSpec<PrometheusDatasourceSpec> => {
      return {
        default: false,
        plugin: {
          kind: 'PrometheusDatasource',
          spec: {
            ...datasource,
            exemplars: { enable: true },
          },
        },
      };
    });
    (promStubClient.queryExemplars as Mock).mockClear();
    (promStubClient.queryExemplars as Mock).mockRejectedValueOnce(new Error('exemplar endpoint unavailable'));

    const results = await PrometheusTimeSeriesQuery.getTimeSeriesData({ query: 'up' }, ctx);

    expect(results.series.length).toBeGreaterThan(0);
    expect(results.exemplars).toBeUndefined();
  });

  it('should keep the query working when the exemplar query resolves with an error response', async () => {
    const ctx = createStubContext();
    getDatasource.mockImplementation((): DatasourceSpec<PrometheusDatasourceSpec> => {
      return {
        default: false,
        plugin: {
          kind: 'PrometheusDatasource',
          spec: {
            ...datasource,
            exemplars: { enable: true },
          },
        },
      };
    });
    (promStubClient.queryExemplars as Mock).mockClear();
    (promStubClient.queryExemplars as Mock).mockResolvedValueOnce({
      status: 'error',
      errorType: 'bad_data',
      error: 'exemplars storage is not enabled',
    });

    const results = await PrometheusTimeSeriesQuery.getTimeSeriesData({ query: 'up' }, ctx);

    expect(results.series.length).toBeGreaterThan(0);
    expect(results.exemplars).toBeUndefined();
  });

  it('should use instantQuery when spec.instant is unset and context mode is instant', async () => {
    const ctx = createStubContext();
    ctx.mode = 'instant';
    (promStubClient.instantQuery as Mock).mockClear();
    (promStubClient.rangeQuery as Mock).mockClear();

    await PrometheusTimeSeriesQuery.getTimeSeriesData(
      {
        query: 'up',
      },
      ctx,
    );

    expect(promStubClient.instantQuery).toHaveBeenCalledTimes(1);
    expect(promStubClient.rangeQuery).not.toHaveBeenCalled();
  });

  it('should explain that $__rate_interval cannot be used as Min Step, for range and instant queries', async () => {
    const ctx = createStubContext();
    // In a dashboard, the built-in variables of the Prometheus datasource resolve to themselves:
    // they are only replaced in the PromQL query, with values computed from the step.
    ctx.variableState = { __rate_interval: { value: '$__rate_interval', loading: false } };
    (promStubClient.rangeQuery as Mock).mockClear();
    (promStubClient.instantQuery as Mock).mockClear();
    const minStep = '$__rate_interval' as DurationString;

    await expect(PrometheusTimeSeriesQuery.getTimeSeriesData({ query: 'up', minStep }, ctx)).rejects.toThrow(
      "'$__rate_interval' cannot be used as Min Step",
    );
    await expect(
      PrometheusTimeSeriesQuery.getTimeSeriesData({ query: 'up', minStep, instant: true }, ctx),
    ).rejects.toThrow("'$__rate_interval' cannot be used as Min Step");
    expect(promStubClient.rangeQuery).not.toHaveBeenCalled();
    expect(promStubClient.instantQuery).not.toHaveBeenCalled();
  });

  it('should resolve the variables used in the Min Step', async () => {
    const ctx = createStubContext();
    // On a 6h range, the step is the Min Step: it is above the safe step (3s), and no step is suggested
    ctx.timeRange = { start: new Date('2023-01-01T00:00:00Z'), end: new Date('2023-01-01T06:00:00Z') };
    ctx.variableState = { resolution: { value: '5m', loading: false } };
    (promStubClient.rangeQuery as Mock).mockClear();

    await PrometheusTimeSeriesQuery.getTimeSeriesData({ query: 'up', minStep: '$resolution' as DurationString }, ctx);

    expect(promStubClient.rangeQuery).toHaveBeenCalledTimes(1);
    const [params] = (promStubClient.rangeQuery as Mock).mock.calls[0] as [{ step: number }];
    expect(params.step).toBe(300);
  });

  it('should use the scrape interval of the datasource when a variable used as Min Step has an empty value', async () => {
    const ctx = createStubContext();
    ctx.timeRange = { start: new Date('2023-01-01T00:00:00Z'), end: new Date('2023-01-01T06:00:00Z') };
    ctx.variableState = { resolution: { value: '', loading: false } };
    // A scrape interval that differs from the default (1m), so that the test fails if the default is used instead
    getDatasource.mockImplementationOnce((): DatasourceSpec<PrometheusDatasourceSpec> => {
      return {
        default: false,
        plugin: { kind: 'PrometheusDatasource', spec: { ...datasource, scrapeInterval: '2m' } },
      };
    });
    (promStubClient.rangeQuery as Mock).mockClear();

    await PrometheusTimeSeriesQuery.getTimeSeriesData({ query: 'up', minStep: '$resolution' as DurationString }, ctx);

    expect(promStubClient.rangeQuery).toHaveBeenCalledTimes(1);
    const [params] = (promStubClient.rangeQuery as Mock).mock.calls[0] as [{ step: number }];
    expect(params.step).toBe(120);
  });

  it('should not use the scrape interval of the datasource when the Min Step is 0s', async () => {
    const ctx = createStubContext();
    ctx.timeRange = { start: new Date('2023-01-01T00:00:00Z'), end: new Date('2023-01-01T06:00:00Z') };
    // Below the scrape interval of the datasource (1m): a Min Step of 0s sets no lower bound
    ctx.suggestedStepMs = 15 * 1000;
    (promStubClient.rangeQuery as Mock).mockClear();

    await PrometheusTimeSeriesQuery.getTimeSeriesData({ query: 'up', minStep: '0s' }, ctx);

    expect(promStubClient.rangeQuery).toHaveBeenCalledTimes(1);
    const [params] = (promStubClient.rangeQuery as Mock).mock.calls[0] as [{ step: number }];
    expect(params.step).toBe(15);
  });
});
