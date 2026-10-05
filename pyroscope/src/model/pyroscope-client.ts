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

import type { FetchFn, RequestHeaders } from '@perses-dev/client';
import type { DatasourceClient } from '@perses-dev/plugin-system';

import type {
  SearchProfileTypesParameters,
  SearchProfileTypesResponse,
  SearchLabelNamesParameters,
  SearchLabelNamesResponse,
  SearchLabelValuesParameters,
  SearchLabelValuesResponse,
  SelectMergeStacktracesRequest,
  SelectMergeStacktracesResponse,
  SelectSeriesRequest,
  SelectSeriesResponse,
} from './api-types';

interface PyroscopeClientOptions {
  datasourceUrl: string;
  headers?: RequestHeaders;
  minStepSeconds?: number;
}

export interface PyroscopeClient extends DatasourceClient {
  options: PyroscopeClientOptions;
  selectMergeStacktraces(
    body: SelectMergeStacktracesRequest,
    headers?: RequestHeaders,
  ): Promise<SelectMergeStacktracesResponse>;
  selectSeries(body: SelectSeriesRequest, headers?: RequestHeaders): Promise<SelectSeriesResponse>;
  searchProfileTypes(
    params: SearchProfileTypesParameters,
    headers: RequestHeaders,
    body: Record<string, string | number>,
  ): Promise<SearchProfileTypesResponse>;
  searchLabelNames(
    params: SearchLabelNamesParameters,
    headers: RequestHeaders,
    body: Record<string, string | number | string[]>,
  ): Promise<SearchLabelNamesResponse>;
  searchLabelValues(
    params: SearchLabelValuesParameters,
    headers: RequestHeaders,
    body: Record<string, string | number | string[]>,
  ): Promise<SearchLabelValuesResponse>;
  searchServices(
    params: SearchLabelValuesParameters,
    headers: RequestHeaders,
    body: Record<string, string | number>,
  ): Promise<SearchLabelValuesResponse>;
}

export interface QueryOptions {
  datasourceUrl: string;
  headers?: RequestHeaders;
  fetch?: FetchFn;
}

export const executeRequest = async <T>(
  customFetch: FetchFn | undefined,
  ...args: Parameters<typeof global.fetch>
): Promise<T> => {
  const doFetch = customFetch ?? fetch;
  const response = await doFetch(...args);
  try {
    return await response.json();
  } catch (e) {
    console.error('Invalid response from server', e);
    throw new Error('Invalid response from server');
  }
};

function fetchWithPost<T, TResponse>(
  apiURI: string,
  params: T | null,
  queryOptions: QueryOptions,
  body: Record<string, unknown>,
): Promise<TResponse> {
  const { datasourceUrl, headers = {}, fetch: customFetch } = queryOptions;

  let url = `${datasourceUrl}${apiURI}`;
  if (params) {
    url += '?' + new URLSearchParams(params);
  }
  const init = {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  };

  return executeRequest<TResponse>(customFetch, url, init);
}

/**
 * Returns the flame graph for the matching profiles.
 */
export function selectMergeStacktraces(
  body: SelectMergeStacktracesRequest,
  queryOptions: QueryOptions,
): Promise<SelectMergeStacktracesResponse> {
  const { datasourceUrl, headers = {}, fetch: customFetch } = queryOptions;

  return executeRequest<SelectMergeStacktracesResponse>(
    customFetch,
    `${datasourceUrl}/querier.v1.QuerierService/SelectMergeStacktraces`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    },
  );
}

/**
 * Returns the time series (timeline) for the matching profiles.
 */
export function selectSeries(body: SelectSeriesRequest, queryOptions: QueryOptions): Promise<SelectSeriesResponse> {
  const { datasourceUrl, headers = {}, fetch: customFetch } = queryOptions;

  return executeRequest<SelectSeriesResponse>(customFetch, `${datasourceUrl}/querier.v1.QuerierService/SelectSeries`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

/**
 * Returns a list of all profile types.
 */
export function searchProfileTypes(
  params: SearchProfileTypesParameters,
  queryOptions: QueryOptions,
  body: Record<string, string | number>,
): Promise<SearchProfileTypesResponse> {
  return fetchWithPost<SearchProfileTypesParameters, SearchProfileTypesResponse>(
    '/querier.v1.QuerierService/ProfileTypes',
    params,
    queryOptions,
    body,
  );
}

/**
 * Returns a list of all label names.
 */
export function searchLabelNames(
  params: SearchLabelNamesParameters,
  queryOptions: QueryOptions,
  body: Record<string, string | number | string[]>,
): Promise<SearchLabelNamesResponse> {
  return fetchWithPost<SearchLabelNamesParameters, SearchLabelNamesResponse>(
    '/querier.v1.QuerierService/LabelNames',
    params,
    queryOptions,
    body,
  );
}

/**
 * Returns a list of all label values for a given label name.
 */
export function searchLabelValues(
  params: SearchLabelValuesParameters,
  queryOptions: QueryOptions,
  body: Record<string, string | number | string[]>,
): Promise<SearchLabelValuesResponse> {
  return fetchWithPost<SearchLabelValuesParameters, SearchLabelValuesResponse>(
    '/querier.v1.QuerierService/LabelValues',
    params,
    queryOptions,
    body,
  );
}

/**
 * Returns a list of all services.
 * This is a special case of label values where the label name is "service_name".
 */
export function searchServices(
  params: SearchLabelValuesParameters,
  queryOptions: QueryOptions,
  body: Record<string, string | number>,
): Promise<SearchLabelValuesResponse> {
  return fetchWithPost<SearchLabelValuesParameters, SearchLabelValuesResponse>(
    '/querier.v1.QuerierService/LabelValues',
    params,
    queryOptions,
    { name: 'service_name', ...body },
  );
}
