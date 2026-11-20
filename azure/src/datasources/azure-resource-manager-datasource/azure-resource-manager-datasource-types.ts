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
export interface AzureResourceGraphApiRequestBody {
  query: string;
  subscriptions?: string[];
  managementGroups?: string[];
  options?: QueryRequestOptions;
}

interface QueryRequestOptions {
  $skip?: number;
  $skipToken?: string;
  $top?: number;
}

export type AzureResourceGraphApiSuccessResponseBody = QueryResponse;
export type AzureResourceGraphApiErrorResponseBody = CommonErrorResponse;

interface QueryResponse {
  $skipToken?: string;
  count: number;
  data: unknown[]; // Assumed in table format
  resultTruncated: boolean;
  totalRecord: number;
}

interface CommonErrorResponse {
  error: CommonError;
}

interface CommonError {
  code: string;
  details: CommonErrorDetails[];
  message: string;
}

interface CommonErrorDetails {
  code: string;
  message: string;
}
// =====

// Query
export interface ResourceGraphQueryRequestParameters {
  kqlQuery: string;
  subscriptions?: string[];
  managementGroups?: string[];
}
// =====

// Datasource
export interface AzureResourceManagerDatasourceSpec {
  directUrl?: string;
  proxy?: HTTPProxy;
  maxRequestsPerQuery?: number;
}

export interface AzureResourceManagerDatasourceResponse {
  data: unknown[]; // Assumed in table format
  warning?: string;
}

interface AzureResourceManagerDatasourceClientOptions {
  datasourceUrl: string;
  headers?: RequestHeaders;
}

export interface AzureResourceManagerDatasourceClient extends DatasourceClient {
  options: AzureResourceManagerDatasourceClientOptions;
  resourceGraphQuery(
    resourceGraphParams: ResourceGraphQueryRequestParameters,
    headers?: RequestHeaders,
  ): Promise<AzureResourceManagerDatasourceResponse>;
}
// =====
