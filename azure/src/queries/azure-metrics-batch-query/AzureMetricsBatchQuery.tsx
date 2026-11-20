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

import type { TimeSeriesQueryPlugin } from '@perses-dev/plugin-system';
import { isVariableDatasource, parseVariables } from '@perses-dev/plugin-system';

import type { AzureMetricsBatchQuerySpec } from './azure-metrics-batch-query-types';
import { AzureMetricsBatchQueryEditor } from './AzureMetricsBatchQueryEditor';
import { getTimeSeriesData } from './get-time-series-data';

const initialOptions: AzureMetricsBatchQuerySpec = {
  subscriptionId: '',
  resourceIds: [],
  metricNames: [],
  metricNamespace: '',
  singlePoint: false,
  flattenMetrics: false,
};

export const AzureMetricsBatchQuery: TimeSeriesQueryPlugin<AzureMetricsBatchQuerySpec> = {
  getTimeSeriesData,
  OptionsEditorComponent: AzureMetricsBatchQueryEditor,
  createInitialOptions: () => initialOptions,
  dependsOn: (spec) => {
    const queryVariables = [spec.subscriptionId, spec.filter].flatMap((value) => {
      return value ? parseVariables(value) : [];
    });
    const resourceIdVariables = spec.resourceIds.flatMap((resourceId) => parseVariables(resourceId));
    const datasourceVariable = isVariableDatasource(spec.datasource) ? parseVariables(spec.datasource ?? '') : [];
    return {
      variables: [...new Set([...queryVariables, ...resourceIdVariables, ...datasourceVariable])],
    };
  },
};
