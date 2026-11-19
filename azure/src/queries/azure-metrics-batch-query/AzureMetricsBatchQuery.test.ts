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
import { AzureMetricsBatchQuery } from './AzureMetricsBatchQuery';

const dummyCtx = {} as TimeSeriesQueryContext;

function dependsOn(spec: AzureMetricsBatchQuerySpec): string[] {
  return AzureMetricsBatchQuery.dependsOn!(spec, dummyCtx).variables ?? [];
}

const baseSpec: AzureMetricsBatchQuerySpec = {
  subscriptionId: '00000000-0000-0000-0000-000000000001',
  resourceIds: ['/resource/1'],
  metricNamespace: 'Microsoft.Compute/virtualMachines',
  metricNames: ['Percentage CPU'],
};

describe('AzureMetricsBatchQuery.createInitialOptions', () => {
  it('returns the expected default spec', () => {
    expect(AzureMetricsBatchQuery.createInitialOptions()).toEqual({
      subscriptionId: '',
      resourceIds: [],
      metricNames: [],
      metricNamespace: '',
      singlePoint: false,
      flattenMetrics: false,
    });
  });
});

describe('AzureMetricsBatchQuery.dependsOn', () => {
  it('returns no variables when none are referenced', () => {
    expect(dependsOn(baseSpec)).toEqual([]);
  });

  it('finds a variable referenced in subscriptionId', () => {
    expect(dependsOn({ ...baseSpec, subscriptionId: '$subscription' })).toContain('subscription');
  });

  it('finds a variable referenced in resourceIds', () => {
    expect(dependsOn({ ...baseSpec, resourceIds: ['$resources'] })).toContain('resources');
  });

  it('finds a variable referenced in filter', () => {
    expect(dependsOn({ ...baseSpec, filter: "resourceGroup eq '$rg'" })).toContain('rg');
  });

  it('does not fail when filter is undefined', () => {
    expect(dependsOn({ ...baseSpec, filter: undefined })).toEqual([]);
  });

  it('finds a variable used as the datasource', () => {
    expect(dependsOn({ ...baseSpec, datasource: '$datasourceVar' })).toContain('datasourceVar');
  });

  it('does not treat a static datasource selector as a variable dependency', () => {
    expect(dependsOn({ ...baseSpec, datasource: { kind: 'AzureRegionalMetricsDatasource', name: 'datasourceName' } })).toEqual(
      [],
    );
  });

  it('combines and de-duplicates variables from all fields', () => {
    const variables = dependsOn({
      ...baseSpec,
      subscriptionId: '$sub',
      resourceIds: ['$sub'],
      filter: "name eq '$sub'",
      datasource: '$sub',
    });
    expect(variables).toEqual(['sub']);
  });
});

describe('AzureMetricsBatchQuery.getTimeSeriesData', () => {
  it('performs a query against the datasource and returns the results', async () => {
    const metricsBatchQuery: Mock = vi.fn(async () => ({
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
                  data: [{ timeStamp: '2024-01-01T00:00:00.000Z', average: 10 }],
                },
              ],
            },
          ],
        },
      ],
    }));
    const getDatasourceClient: Mock = vi.fn(async () => ({
      options: { datasourceUrl: 'http://direct.example' },
      metricsBatchQuery,
    }));
    const ctx: TimeSeriesQueryContext = {
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

    const result = await AzureMetricsBatchQuery.getTimeSeriesData(baseSpec, ctx);

    expect(metricsBatchQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: '00000000-0000-0000-0000-000000000001',
        resourceIds: ['/resource/1'],
      }),
    );
    expect(result.series).toHaveLength(1);
    expect(result.series[0]?.name).toBe('/resource/1/providers/Microsoft.Insights/metrics/Percentage CPU - average');
    expect(result.series[0]?.labels).toEqual({
      resourceId: '/resource/1',
      metricName: 'Percentage CPU',
      aggregationName: 'average',
    });
    expect(result.series[0]?.values).toEqual([[Date.parse('2024-01-01T00:00:00.000Z'), 10]]);
  });
});
