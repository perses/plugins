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

import type { VariableOption, VariablePlugin } from '@perses-dev/plugin-system';
import { parseVariables, replaceVariables } from '@perses-dev/plugin-system';

import type { CloudWatchClient, CloudWatchDimensions, CloudWatchMetricInfo } from '../../model';
import { DEFAULT_CLOUDWATCH } from '../../model';
import type { CloudWatchDimensionValuesVariableSpec } from './cloudwatch-dimension-values-variable-types';
import { CloudWatchDimensionValuesVariableEditor } from './CloudWatchDimensionValuesVariableEditor';

/**
 * Returns the sorted distinct values of a dimension in the discovered metrics.
 */
export function getDimensionValues(metrics: CloudWatchMetricInfo[], dimensionKey: string): VariableOption[] {
  const values = new Set<string>();
  for (const metric of metrics) {
    for (const dimension of metric.Dimensions) {
      if (dimension.Name === dimensionKey) {
        values.add(dimension.Value);
      }
    }
  }
  return [...values].toSorted().map((value) => ({ value, label: value }));
}

export const CloudWatchDimensionValuesVariable: VariablePlugin<CloudWatchDimensionValuesVariableSpec> = {
  getVariableOptions: async (spec, ctx, abortSignal) => {
    const client = await ctx.datasourceStore.getDatasourceClient<CloudWatchClient>(
      spec.datasource ?? DEFAULT_CLOUDWATCH,
    );
    let dimensions: CloudWatchDimensions | undefined;
    if (spec.dimensions !== undefined) {
      dimensions = Object.fromEntries(
        Object.entries(spec.dimensions).map(([name, value]) => [
          replaceVariables(name, ctx.variables),
          replaceVariables(value, ctx.variables),
        ]),
      );
    }
    const dimensionKey = replaceVariables(spec.dimensionKey, ctx.variables);
    const response = await client.listMetrics(
      {
        namespace: replaceVariables(spec.namespace, ctx.variables),
        metricName: spec.metricName ? replaceVariables(spec.metricName, ctx.variables) : undefined,
        dimensions,
      },
      abortSignal,
    );
    return { data: getDimensionValues(response.Metrics, dimensionKey) };
  },
  dependsOn: (spec) => {
    const texts = [
      spec.namespace,
      spec.metricName ?? '',
      spec.dimensionKey,
      ...Object.entries(spec.dimensions ?? {}).flat(),
    ];
    return { variables: [...new Set(texts.flatMap((text) => parseVariables(text)))] };
  },
  OptionsEditorComponent: CloudWatchDimensionValuesVariableEditor,
  createInitialOptions: () => ({ namespace: 'AWS/EC2', dimensionKey: 'InstanceId' }),
};
