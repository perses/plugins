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

import type { GetVariableOptionsContext } from '@perses-dev/plugin-system';

import type { CloudWatchMetricInfo } from '../../model';
import { CloudWatchDimensionValuesVariable, getDimensionValues } from './CloudWatchDimensionValuesVariable';

const metrics: CloudWatchMetricInfo[] = [
  { Namespace: 'AWS/EC2', MetricName: 'CPUUtilization', Dimensions: [{ Name: 'InstanceId', Value: 'i-2' }] },
  {
    Namespace: 'AWS/EC2',
    MetricName: 'CPUUtilization',
    Dimensions: [
      { Name: 'AutoScalingGroupName', Value: 'web' },
      { Name: 'InstanceId', Value: 'i-1' },
    ],
  },
  { Namespace: 'AWS/EC2', MetricName: 'NetworkIn', Dimensions: [{ Name: 'InstanceId', Value: 'i-2' }] },
  { Namespace: 'AWS/EC2', MetricName: 'CPUUtilization', Dimensions: [] },
];

describe('getDimensionValues', () => {
  it('returns the sorted distinct values of the dimension', () => {
    expect(getDimensionValues(metrics, 'InstanceId')).toEqual([
      { value: 'i-1', label: 'i-1' },
      { value: 'i-2', label: 'i-2' },
    ]);
    expect(getDimensionValues(metrics, 'Unknown')).toEqual([]);
  });
});

describe('CloudWatchDimensionValuesVariable', () => {
  const spec = {
    namespace: 'AWS/EC2',
    metricName: 'CPUUtilization',
    dimensionKey: 'InstanceId',
    dimensions: { AutoScalingGroupName: '$asg' },
  };

  it('discovers the dimension values with the variables replaced', async () => {
    const listMetrics = vi.fn().mockResolvedValue({ Metrics: metrics, Truncated: false });
    const ctx = {
      variables: { asg: { value: 'web', loading: false, options: [] } },
      datasourceStore: { getDatasourceClient: vi.fn().mockResolvedValue({ listMetrics }) },
    } as unknown as GetVariableOptionsContext;

    const { data } = await CloudWatchDimensionValuesVariable.getVariableOptions(spec, ctx);

    expect(listMetrics).toHaveBeenCalledWith(
      { namespace: 'AWS/EC2', metricName: 'CPUUtilization', dimensions: { AutoScalingGroupName: 'web' } },
      undefined,
    );
    expect(data.map((option) => option.value)).toEqual(['i-1', 'i-2']);
  });

  it('depends on the variables of the filters', () => {
    expect(CloudWatchDimensionValuesVariable.dependsOn?.(spec, {} as GetVariableOptionsContext)).toEqual({
      variables: ['asg'],
    });
  });
});
