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

import type { DatasourceSelectValue } from '@perses-dev/plugin-system';

import type { AzureRegionalMetricsDatasourceSelector } from './azure-metrics-batch-query-selectors';
import type { AZURE_METRICS_BATCH_AGGREGATION_TYPES } from './constants';

type AggregationTypes = (typeof AZURE_METRICS_BATCH_AGGREGATION_TYPES)[number];

export interface AzureMetricsBatchQuerySpec {
  subscriptionId: string;
  resourceIds: string[]; // Each entry may itself resolve to a comma-separated list via a variable
  metricNamespace: string;
  metricNames: string[];
  aggregation?: AggregationTypes[];
  filter?: string;
  interval?: string;
  singlePoint?: boolean; // Corresponds to interval='FULL', returning a single point for the entire time range
  flattenMetrics?: boolean;
  top?: number;
  orderBy?: string;
  rollupBy?: string;
  datasource?: DatasourceSelectValue<AzureRegionalMetricsDatasourceSelector>;
}
