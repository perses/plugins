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

import type { RequestHeaders } from '@perses-dev/client';
import type { DatasourceClient } from '@perses-dev/plugin-system';
import type { HTTPProxy } from '@perses-dev/spec';

// Azure API
export interface AzureMetricsBatchApiRequestBody {
  resourceids: string[];
}

export type AzureMetricsBatchApiSuccessResponseBody = MetricResultsResponse;
export type AzureMetricsBatchApiErrorResponseBody = ErrorResponse;

interface MetricResultsResponse {
  values: Value[]; // One Value per resource id
}

export interface Value {
  starttime: string;
  endtime: string;
  interval: string;
  value: Metric[]; // One Metric per metric name (metric requested)
  namespace: string;
  resourceregion: string;
  resourceid: string;
}

export interface Metric {
  id: string;
  type: string;
  name: LocalizableString;
  displayDescription: string;
  unit: string;
  timeseries: TimeSeriesElement[]; // One TimeSeriesElement per metadata tag
  errorCode?: string;
  errorMessage?: string;
}

export interface TimeSeriesElement {
  data: MetricValue[]; // One MetricValue per timestamp
  metadatavalues: MetadataValue[];
}

export interface MetricValue {
  timeStamp: string;
  average?: number;
  count?: number;
  maximum?: number;
  minimum?: number;
  total?: number;
}

export interface MetadataValue {
  name: LocalizableString;
  value: string;
}

interface LocalizableString {
  localizedValue: string;
  value: string;
}

export interface ErrorResponse {
  error: ErrorDetail;
}

interface ErrorDetail {
  additionalInfo?: ErrorAdditionalInfo[];
  code: string;
  details?: ErrorDetail[];
  message: string;
  target: string;
}

interface ErrorAdditionalInfo {
  info: unknown;
  type: string;
}
// =====

// Query
export interface AzureMetricsBatchQueryRequestOptions {
  subscriptionId: string;
  queryParameters: AzureMetricsBatchQueryRequestParameters;
  resourceIds: string[];
}

interface AzureMetricsBatchQueryRequestParameters {
  metricNames: string[];
  metricNamespace: string;
  startTime: Date;
  endTime: Date;
  aggregation?: string[];
  filter?: string;
  interval?: string;
  orderBy?: string;
  rollupBy?: string;
  top?: number;
}
// =====

// Datasource
// The datasource endpoint should use one of the locations (programmatic name) in https://learn.microsoft.com/en-us/azure/reliability/regions-list?tabs=all
export interface AzureRegionalMetricsDatasourceSpec {
  directUrl?: string;
  proxy?: HTTPProxy;
  maxRequestsPerQuery?: number;
}

export interface AzureRegionalMetricsDatasourceResponse {
  values: Value[];
  warning?: string;
}

interface AzureRegionalMetricsDatasourceClientOptions {
  datasourceUrl: string;
  headers?: RequestHeaders;
}

export interface AzureRegionalMetricsDatasourceClient extends DatasourceClient {
  options: AzureRegionalMetricsDatasourceClientOptions;
  metricsBatchQuery(
    metricsBatchParams: AzureMetricsBatchQueryRequestOptions,
    headers?: RequestHeaders,
  ): Promise<AzureRegionalMetricsDatasourceResponse>;
}
// =====
