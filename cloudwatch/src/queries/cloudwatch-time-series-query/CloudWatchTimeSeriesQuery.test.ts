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

import type { TimeSeriesQueryContext, VariableStateMap } from '@perses-dev/plugin-system';

import type { CloudWatchClient } from '../../model';
import type { CloudWatchTimeSeriesQuerySpec } from './cloudwatch-time-series-query-types';
import { CloudWatchTimeSeriesQuery } from './CloudWatchTimeSeriesQuery';
import { validateQueries } from './CloudWatchTimeSeriesQueryEditor';

const variables: VariableStateMap = {
  instance: { value: 'i-0123', loading: false, options: [] },
  namespace: { value: 'AWS/EC2', loading: false, options: [] },
};

const spec: CloudWatchTimeSeriesQuerySpec = {
  queries: [
    {
      id: 'm1',
      returnData: false,
      metric: {
        namespace: '$namespace',
        name: 'CPUUtilization',
        dimensions: { InstanceId: '$instance' },
        statistic: 'Average',
        period: 60,
      },
    },
    { id: 'e1', expression: 'm1 * 2', label: 'CPU of $instance' },
  ],
};

function createContext(
  client: Partial<CloudWatchClient>,
  days: number,
  suggestedStepMs?: number,
): TimeSeriesQueryContext {
  const end = new Date('2026-09-30T00:00:00Z');
  return {
    timeRange: { start: new Date(end.getTime() - days * 24 * 3600 * 1000), end },
    suggestedStepMs,
    variableState: variables,
    datasourceStore: { getDatasourceClient: vi.fn().mockResolvedValue(client) },
  } as unknown as TimeSeriesQueryContext;
}

describe('CloudWatchTimeSeriesQuery', () => {
  it('replaces the variables and converts the results to time series', async () => {
    const getMetricData = vi.fn().mockResolvedValue({
      MetricDataResults: [
        {
          Id: 'e1',
          Label: 'CPU of i-0123',
          Timestamps: [Date.parse('2026-09-29T23:58:00Z'), Date.parse('2026-09-29T23:59:00Z')],
          Values: [1, 2],
          StatusCode: 'Complete',
        },
      ],
    });

    const result = await CloudWatchTimeSeriesQuery.getTimeSeriesData(spec, createContext({ getMetricData }, 1));

    const request = getMetricData.mock.calls[0]?.[0];
    expect(request.startTime).toBe('2026-09-29T00:00:00.000Z');
    expect(request.endTime).toBe('2026-09-30T00:00:00.000Z');
    expect(request.queries[0].metric).toEqual({
      namespace: 'AWS/EC2',
      name: 'CPUUtilization',
      dimensions: { InstanceId: 'i-0123' },
      statistic: 'Average',
      period: 60,
    });
    expect(request.queries[1]).toEqual({ id: 'e1', expression: 'm1 * 2', label: 'CPU of i-0123' });
    expect(result.series).toEqual([
      {
        name: 'CPU of i-0123',
        values: [
          [Date.parse('2026-09-29T23:58:00Z'), 1],
          [Date.parse('2026-09-29T23:59:00Z'), 2],
        ],
      },
    ]);
    expect(result.stepMs).toBe(60_000);
  });

  it('increases the period of a long time range', async () => {
    const getMetricData = vi.fn().mockResolvedValue({ MetricDataResults: [] });

    const result = await CloudWatchTimeSeriesQuery.getTimeSeriesData(spec, createContext({ getMetricData }, 7));

    expect(getMetricData.mock.calls[0]?.[0].queries[0].metric.period).toBe(120);
    expect(result.stepMs).toBe(120_000);
  });

  it('uses the step suggested by the panel', async () => {
    const getMetricData = vi.fn().mockResolvedValue({ MetricDataResults: [] });

    await CloudWatchTimeSeriesQuery.getTimeSeriesData(spec, createContext({ getMetricData }, 1, 300_000));

    expect(getMetricData.mock.calls[0]?.[0].queries[0].metric.period).toBe(300);
  });

  it('lists the variables the queries depend on', () => {
    const dependsOn = CloudWatchTimeSeriesQuery.dependsOn?.(spec, {} as TimeSeriesQueryContext);
    expect(dependsOn?.variables).toEqual(expect.arrayContaining(['instance', 'namespace']));
    expect(dependsOn?.variables).toHaveLength(2);
  });

  it('creates a valid initial query', () => {
    expect(validateQueries(CloudWatchTimeSeriesQuery.createInitialOptions().queries)).toBeUndefined();
  });
});

describe('validateQueries', () => {
  it('accepts metrics and expressions', () => {
    expect(validateQueries(spec.queries)).toBeUndefined();
  });

  it.each([
    ['no query', []],
    [
      'duplicate IDs',
      [
        { id: 'e1', expression: 'm1' },
        { id: 'e1', expression: 'm1' },
      ],
    ],
    ['an invalid ID', [{ id: 'M1', expression: 'm1' }]],
    ['a metric and an expression', [{ id: 'm1', expression: 'm1', metric: spec.queries[0]?.metric }]],
    [
      'an unsupported statistic',
      [{ id: 'm1', metric: { namespace: 'AWS/EC2', name: 'CPU', statistic: 'avg', period: 60 } }],
    ],
    [
      'a period not multiple of 60',
      [{ id: 'm1', metric: { namespace: 'AWS/EC2', name: 'CPU', statistic: 'Sum', period: 90 } }],
    ],
    ['no returned data', [{ id: 'm1', returnData: false, expression: 'm2' }]],
  ])('rejects %s', (_, queries) => {
    expect(validateQueries(queries)).toBeDefined();
  });
});
