// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type { TimeSeriesQueryContext } from '@perses-dev/plugin-system';
import type { Mock } from 'vitest';

import type { AzureMetricsBatchQuerySpec } from './azure-metrics-batch-query-types';
import { getTimeSeriesData } from './get-time-series-data';
import { parseIso8601DurationMs } from './iso8601-duration';

const metricsBatchQuery: Mock = vi.fn();
const getDatasourceClient: Mock = vi.fn(async () => ({
  options: { datasourceUrl: 'http://direct.example' },
  metricsBatchQuery,
}));

function createStubContext(): TimeSeriesQueryContext {
  return {
    datasourceStore: {
      getDatasource: vi.fn(),
      getDatasourceClient,
      listDatasourceSelectItems: vi.fn(async () => []),
      getLocalDatasources: vi.fn(),
      setLocalDatasources: vi.fn(),
      getSavedDatasources: vi.fn(),
      setSavedDatasources: vi.fn(),
    },
    timeRange: {
      start: new Date('2024-01-01T00:00:00.000Z'),
      end: new Date('2024-01-01T01:00:00.000Z'),
    },
    variableState: {},
  };
}

const baseSpec: AzureMetricsBatchQuerySpec = {
  subscriptionId: '00000000-0000-0000-0000-000000000001',
  resourceIds: ['/resource/1'],
  metricNamespace: 'Microsoft.Compute/virtualMachines',
  metricNames: ['Percentage CPU'],
};

const multiResourceSpec: AzureMetricsBatchQuerySpec = {
  subscriptionId: '00000000-0000-0000-0000-000000000001',
  resourceIds: ['/resource/1', '/resource/2'],
  metricNamespace: 'Microsoft.Compute/virtualMachines',
  metricNames: ['Percentage CPU'],
};

describe('getTimeSeriesData', () => {
  beforeEach(() => {
    metricsBatchQuery.mockReset();
    metricsBatchQuery.mockResolvedValue({ values: [] });
  });

  it('returns an empty series when subscriptionId is missing', async () => {
    const result = await getTimeSeriesData({ ...baseSpec, subscriptionId: '' }, createStubContext());
    expect(result).toEqual({ series: [] });
    expect(metricsBatchQuery).not.toHaveBeenCalled();
  });

  it('returns an empty series when metricNamespace is missing', async () => {
    const result = await getTimeSeriesData({ ...baseSpec, metricNamespace: '' }, createStubContext());
    expect(result).toEqual({ series: [] });
    expect(metricsBatchQuery).not.toHaveBeenCalled();
  });

  it('returns an empty series when resourceIds is empty', async () => {
    const result = await getTimeSeriesData({ ...baseSpec, resourceIds: [] }, createStubContext());
    expect(result).toEqual({ series: [] });
    expect(metricsBatchQuery).not.toHaveBeenCalled();
  });

  it('replaces variables and splits resourceIds into a trimmed list', async () => {
    const ctx = createStubContext();
    ctx.variableState = {
      sub: { value: '00000000-0000-0000-0000-000000000001', loading: false },
      resource: { value: ['/resource/2', ' /resource/3 '], loading: false },
    };

    await getTimeSeriesData(
      {
        ...baseSpec,
        subscriptionId: '$sub',
        resourceIds: [' /resource/1 ', '${resource:csv}', ' /resource/4 '],
      },
      ctx,
    );

    const [request] = metricsBatchQuery.mock.calls[0] as [{ subscriptionId: string; resourceIds: string[] }];
    expect(request.subscriptionId).toBe('00000000-0000-0000-0000-000000000001');
    expect(request.resourceIds).toEqual(['/resource/1', '/resource/2', '/resource/3', '/resource/4']);
  });

  it('builds the query with the time range and replaces variables in the filter', async () => {
    const ctx = createStubContext();
    ctx.variableState = { rg: { value: 'rg-1', loading: false } };

    await getTimeSeriesData({ ...baseSpec, filter: "resourceGroup eq '$rg'\nand other" }, ctx);

    const [request] = metricsBatchQuery.mock.calls[0] as [{ queryParameters: Record<string, unknown> }];
    expect(request.queryParameters.startTime).toEqual(ctx.timeRange.start);
    expect(request.queryParameters.endTime).toEqual(ctx.timeRange.end);
    expect(request.queryParameters.filter).toBe("resourceGroup eq 'rg-1' and other");
  });

  it('uses the FULL interval when singlePoint is true regardless of the configured interval', async () => {
    await getTimeSeriesData({ ...baseSpec, singlePoint: true, interval: 'PT5M' }, createStubContext());

    const [request] = metricsBatchQuery.mock.calls[0] as [{ queryParameters: { interval?: string } }];
    expect(request.queryParameters.interval).toBe('FULL');
  });

  it('uses the configured interval when singlePoint is false', async () => {
    await getTimeSeriesData({ ...baseSpec, singlePoint: false, interval: 'PT5M' }, createStubContext());

    const [request] = metricsBatchQuery.mock.calls[0] as [{ queryParameters: { interval?: string } }];
    expect(request.queryParameters.interval).toBe('PT5M');
  });

  it('computes stepMs from the interval when not a single point', async () => {
    const result = await getTimeSeriesData({ ...baseSpec, interval: 'PT5M' }, createStubContext());
    expect(result.stepMs).toBe(parseIso8601DurationMs('PT5M'));
  });

  it('does not compute stepMs when singlePoint is true', async () => {
    const result = await getTimeSeriesData({ ...baseSpec, singlePoint: true }, createStubContext());
    expect(result.stepMs).toBeUndefined();
  });

  it('includes the executed query string in the metadata', async () => {
    const result = await getTimeSeriesData(baseSpec, createStubContext());
    const expectedQuery = (metricsBatchQuery.mock.calls[0] as unknown[])[0];
    expect(result.metadata?.executedQueryString).toBe(JSON.stringify(expectedQuery));
  });

  it('surfaces a warning from the datasource response as a notice', async () => {
    metricsBatchQuery.mockResolvedValue({ values: [], warning: 'truncated' });
    const result = await getTimeSeriesData(baseSpec, createStubContext());
    expect(result.metadata?.notices).toEqual([{ type: 'warning', message: 'truncated' }]);
  });

  it('builds one time series per aggregation present in a time series element', async () => {
    metricsBatchQuery.mockResolvedValue({
      values: [
        {
          starttime: '2024-01-01T00:00:00.000Z',
          endtime: '2024-01-01T01:00:00.000Z',
          interval: 'PT1M',
          namespace: 'Microsoft.Compute/virtualMachines',
          resourceregion: 'eastus',
          resourceid: '/resource/1',
          value: [
            {
              id: '/resource/1/providers/Microsoft.Insights/metrics/Percentage CPU',
              type: 'Microsoft.Insights/metrics',
              name: { localizedValue: 'Percentage CPU', value: 'Percentage CPU' },
              displayDescription: '',
              unit: 'Percent',
              timeseries: [
                {
                  metadatavalues: [],
                  data: [
                    { average: 10, maximum: 20, timeStamp: '2024-01-01T00:00:00.000Z' },
                    { average: 15, maximum: 25, timeStamp: '2024-01-01T00:01:00.000Z' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const result = await getTimeSeriesData(
      {
        ...baseSpec,
        aggregation: ['average', 'maximum'],
      },
      createStubContext(),
    );

    expect(result.series).toHaveLength(2);
    const average = result.series.find((series) => series.name.endsWith('average'));
    const maximum = result.series.find((series) => series.name.endsWith('maximum'));
    expect(average?.values).toEqual([
      [Date.parse('2024-01-01T00:00:00.000Z'), 10],
      [Date.parse('2024-01-01T00:01:00.000Z'), 15],
    ]);
    expect(maximum?.values).toEqual([
      [Date.parse('2024-01-01T00:00:00.000Z'), 20],
      [Date.parse('2024-01-01T00:01:00.000Z'), 25],
    ]);
    expect(average?.labels).toEqual({
      resourceId: '/resource/1',
      metricName: 'Percentage CPU',
      aggregationName: 'average',
    });
    expect(maximum?.labels).toEqual({
      resourceId: '/resource/1',
      metricName: 'Percentage CPU',
      aggregationName: 'maximum',
    });
  });

  it('builds a separate time series for each resource and each aggregation', async () => {
    metricsBatchQuery.mockResolvedValue({
      values: [
        {
          starttime: '2024-01-01T00:00:00.000Z',
          endtime: '2024-01-01T01:00:00.000Z',
          interval: 'PT1M',
          namespace: 'Microsoft.Compute/virtualMachines',
          resourceregion: 'eastus',
          resourceid: '/resource/1',
          value: [
            {
              id: '/resource/1/providers/Microsoft.Insights/metrics/Percentage CPU',
              type: 'Microsoft.Insights/metrics',
              name: { localizedValue: 'Percentage CPU', value: 'Percentage CPU' },
              displayDescription: '',
              unit: 'Percent',
              timeseries: [
                {
                  metadatavalues: [],
                  data: [{ average: 10, maximum: 20, timeStamp: '2024-01-01T00:00:00.000Z' }],
                },
              ],
            },
          ],
        },
        {
          starttime: '2024-01-01T00:00:00.000Z',
          endtime: '2024-01-01T01:00:00.000Z',
          interval: 'PT1M',
          namespace: 'Microsoft.Compute/virtualMachines',
          resourceregion: 'eastus',
          resourceid: '/resource/2',
          value: [
            {
              id: '/resource/2/providers/Microsoft.Insights/metrics/Percentage CPU',
              type: 'Microsoft.Insights/metrics',
              name: { localizedValue: 'Percentage CPU', value: 'Percentage CPU' },
              displayDescription: '',
              unit: 'Percent',
              timeseries: [
                {
                  metadatavalues: [],
                  data: [{ average: 30, maximum: 40, timeStamp: '2024-01-01T00:00:00.000Z' }],
                },
              ],
            },
          ],
        },
      ],
    });

    const result = await getTimeSeriesData(
      {
        ...multiResourceSpec,
        aggregation: ['average', 'maximum'],
      },
      createStubContext(),
    );

    expect(result.series).toHaveLength(4);
    const resourceAggregationPairs = result.series.map((series) => [
      series.labels?.resourceId,
      series.labels?.aggregationName,
    ]);
    expect(resourceAggregationPairs).toEqual(
      expect.arrayContaining([
        ['/resource/1', 'average'],
        ['/resource/1', 'maximum'],
        ['/resource/2', 'average'],
        ['/resource/2', 'maximum'],
      ]),
    );

    const resource1Average = result.series.find(
      (series) => series.labels?.resourceId === '/resource/1' && series.labels?.aggregationName === 'average',
    );
    const resource2Maximum = result.series.find(
      (series) => series.labels?.resourceId === '/resource/2' && series.labels?.aggregationName === 'maximum',
    );
    expect(resource1Average?.values).toEqual([[Date.parse('2024-01-01T00:00:00.000Z'), 10]]);
    expect(resource2Maximum?.values).toEqual([[Date.parse('2024-01-01T00:00:00.000Z'), 40]]);
  });

  it('includes metadata values from the datasource response as labels on the time series', async () => {
    metricsBatchQuery.mockResolvedValue({
      values: [
        {
          starttime: '2024-01-01T00:00:00.000Z',
          endtime: '2024-01-01T01:00:00.000Z',
          interval: 'PT1M',
          namespace: 'Microsoft.Compute/virtualMachines',
          resourceregion: 'eastus',
          resourceid: '/resource/1',
          value: [
            {
              id: '/resource/1/providers/Microsoft.Insights/metrics/Percentage CPU',
              type: 'Microsoft.Insights/metrics',
              name: { localizedValue: 'Percentage CPU', value: 'Percentage CPU' },
              displayDescription: '',
              unit: 'Percent',
              timeseries: [
                {
                  metadatavalues: [
                    { name: { localizedValue: 'Core', value: 'Core' }, value: '0' },
                    { name: { localizedValue: 'Instance', value: 'Instance' }, value: 'vm-1_0' },
                  ],
                  data: [{ average: 10, timeStamp: '2024-01-01T00:00:00.000Z' }],
                },
              ],
            },
          ],
        },
      ],
    });

    const result = await getTimeSeriesData(
      {
        ...baseSpec,
        aggregation: ['average'],
      },
      createStubContext(),
    );

    expect(result.series).toHaveLength(1);
    expect(result.series[0]?.labels).toEqual({
      resourceId: '/resource/1',
      metricName: 'Percentage CPU',
      aggregationName: 'average',
      Core: '0',
      Instance: 'vm-1_0',
    });
  });

  it('flattens metrics into a single labeled time series per resource when singlePoint and flattenMetrics are enabled', async () => {
    metricsBatchQuery.mockResolvedValue({
      values: [
        {
          starttime: '2024-01-01T00:00:00.000Z',
          endtime: '2024-01-01T01:00:00.000Z',
          interval: 'FULL',
          namespace: 'Microsoft.Compute/virtualMachines',
          resourceregion: 'eastus',
          resourceid: '/resource/1',
          value: [
            {
              id: '/resource/1/providers/Microsoft.Insights/metrics/Percentage CPU',
              type: 'Microsoft.Insights/metrics',
              name: { localizedValue: 'Percentage CPU', value: 'Percentage CPU' },
              displayDescription: '',
              unit: 'Percent',
              timeseries: [
                {
                  metadatavalues: [],
                  data: [{ average: 42, maximum: 50, timeStamp: '2024-01-01T00:30:00.000Z' }],
                },
              ],
            },
          ],
        },
        {
          starttime: '2024-01-01T00:00:00.000Z',
          endtime: '2024-01-01T01:00:00.000Z',
          interval: 'FULL',
          namespace: 'Microsoft.Compute/virtualMachines',
          resourceregion: 'eastus',
          resourceid: '/resource/2',
          value: [
            {
              id: '/resource/2/providers/Microsoft.Insights/metrics/Percentage CPU',
              type: 'Microsoft.Insights/metrics',
              name: { localizedValue: 'Percentage CPU', value: 'Percentage CPU' },
              displayDescription: '',
              unit: 'Percent',
              timeseries: [
                {
                  metadatavalues: [],
                  data: [{ average: 10, maximum: 15, timeStamp: '2024-01-01T00:30:00.000Z' }],
                },
              ],
            },
          ],
        },
      ],
    });

    const result = await getTimeSeriesData(
      {
        ...multiResourceSpec,
        aggregation: ['average', 'maximum'],
        singlePoint: true,
        flattenMetrics: true,
      },
      createStubContext(),
    );

    expect(result.series).toHaveLength(2);
    expect(result.series[0]?.name).toBe('/resource/1');
    expect(result.series[0]?.labels).toEqual({
      resourceId: '/resource/1',
      'Percentage CPU-average': '42',
      'Percentage CPU-maximum': '50',
    });
    expect(result.series[0]?.values).toEqual([[Date.parse('2024-01-01T00:30:00.000Z'), 0]]);
    expect(result.series[1]?.name).toBe('/resource/2');
    expect(result.series[1]?.labels).toEqual({
      resourceId: '/resource/2',
      'Percentage CPU-average': '10',
      'Percentage CPU-maximum': '15',
    });
    expect(result.series[1]?.values).toEqual([[Date.parse('2024-01-01T00:30:00.000Z'), 0]]);
  });

  it('does not flatten metrics when flattenMetrics is true but singlePoint is false', async () => {
    metricsBatchQuery.mockResolvedValue({
      values: [
        {
          starttime: '2024-01-01T00:00:00.000Z',
          endtime: '2024-01-01T01:00:00.000Z',
          interval: 'PT1M',
          namespace: 'Microsoft.Compute/virtualMachines',
          resourceregion: 'eastus',
          resourceid: '/resource/1',
          value: [
            {
              id: '/resource/1/providers/Microsoft.Insights/metrics/Percentage CPU',
              type: 'Microsoft.Insights/metrics',
              name: { localizedValue: 'Percentage CPU', value: 'Percentage CPU' },
              displayDescription: '',
              unit: 'Percent',
              timeseries: [
                {
                  metadatavalues: [],
                  data: [{ average: 42, timeStamp: '2024-01-01T00:30:00.000Z' }],
                },
              ],
            },
          ],
        },
      ],
    });

    const result = await getTimeSeriesData(
      {
        ...baseSpec,
        aggregation: ['average'],
        singlePoint: false,
        flattenMetrics: true,
      },
      createStubContext(),
    );

    expect(result.series).toHaveLength(1);
    expect(result.series[0]?.name).toBe('/resource/1/providers/Microsoft.Insights/metrics/Percentage CPU - average');
  });
});
