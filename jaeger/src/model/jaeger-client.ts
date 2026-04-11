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

import { fetch, RequestHeaders } from '@perses-dev/core';
import { DatasourceClient } from '@perses-dev/plugin-system';
import { JaegerApiResponse, JaegerOperation, JaegerSearchRequestParameters, JaegerTrace } from './api-types';

interface JaegerClientOptions {
  datasourceUrl: string;
  headers?: RequestHeaders;
}

export interface JaegerClient extends DatasourceClient {
  options: JaegerClientOptions;
  getTrace(traceId: string, headers?: RequestHeaders): Promise<JaegerApiResponse<JaegerTrace[]>>;
  searchTraces(
    params: JaegerSearchRequestParameters,
    headers?: RequestHeaders
  ): Promise<JaegerApiResponse<JaegerTrace[]>>;
  searchServices(headers?: RequestHeaders): Promise<JaegerApiResponse<string[]>>;
  searchOperations(service: string, headers?: RequestHeaders): Promise<JaegerApiResponse<JaegerOperation[]>>;
}

export interface QueryOptions {
  datasourceUrl: string;
  headers?: RequestHeaders;
}

export const executeRequest = async <T>(...args: Parameters<typeof global.fetch>): Promise<T> => {
  const response = await fetch(...args);
  try {
    return await response.json();
  } catch (e) {
    console.error('Invalid response from server', e);
    throw new Error('Invalid response from server');
  }
};

function buildSearchParams(params: JaegerSearchRequestParameters): URLSearchParams {
  const urlSearchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => urlSearchParams.append(key, entry));
      return;
    }
    urlSearchParams.append(key, value.toString());
  });
  return urlSearchParams;
}

function fetchWithGet<TResponse>(
  apiURI: string,
  params: JaegerSearchRequestParameters,
  queryOptions: QueryOptions
): Promise<TResponse> {
  const { datasourceUrl, headers = {} } = queryOptions;

  let url = `${datasourceUrl}${apiURI}`;
  const urlParams = buildSearchParams(params).toString();
  if (urlParams !== '') {
    url += `?${urlParams}`;
  }

  return executeRequest<TResponse>(url, {
    method: 'GET',
    headers,
  });
}

export function getTrace(traceId: string, queryOptions: QueryOptions): Promise<JaegerApiResponse<JaegerTrace[]>> {
  return fetchWithGet<JaegerApiResponse<JaegerTrace[]>>(`/api/traces/${encodeURIComponent(traceId)}`, {}, queryOptions);
}

export function searchTraces(
  params: JaegerSearchRequestParameters,
  queryOptions: QueryOptions
): Promise<JaegerApiResponse<JaegerTrace[]>> {
  return fetchWithGet<JaegerApiResponse<JaegerTrace[]>>('/api/traces', params, queryOptions);
}

export function searchServices(queryOptions: QueryOptions): Promise<JaegerApiResponse<string[]>> {
  return fetchWithGet<JaegerApiResponse<string[]>>('/api/services', {}, queryOptions);
}

export function searchOperations(
  service: string,
  queryOptions: QueryOptions
): Promise<JaegerApiResponse<JaegerOperation[]>> {
  return fetchWithGet<JaegerApiResponse<JaegerOperation[]>>('/api/operations', { service }, queryOptions);
}
