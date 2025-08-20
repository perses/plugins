// Copyright 2025 The Perses Authors
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
import {
  SearchProfilesParameters,
  SearchProfilesResponse,
  SearchProfileTypesParameters,
  SearchProfileTypesResponse,
  SearchLabelNamesParameters,
  SearchLabelNamesResponse,
  SearchLabelValuesParameters,
  SearchLabelValuesResponse,
} from './api-types';

interface PyroscopeClientOptions {
  datasourceUrl: string;
  headers?: RequestHeaders;
}

export interface PyroscopeClient extends DatasourceClient {
  options: PyroscopeClientOptions;
  searchProfiles(params: SearchProfilesParameters, headers?: RequestHeaders): Promise<SearchProfilesResponse>;
  searchProfileTypes(
    params: SearchProfileTypesParameters,
    headers: RequestHeaders,
    body: Record<string, string | number>
  ): Promise<SearchProfileTypesResponse>;
  searchLabelNames(
    params: SearchLabelNamesParameters,
    headers: RequestHeaders,
    body: Record<string, string | number>
  ): Promise<SearchLabelNamesResponse>;
  searchLabelValues(
    params: SearchLabelValuesParameters,
    headers: RequestHeaders,
    body: Record<string, string | number>
  ): Promise<SearchLabelValuesResponse>;
  searchServices(params: SearchLabelValuesParameters, headers: RequestHeaders): Promise<SearchLabelValuesResponse>;
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

function fetchWithGet<T, TResponse>(apiURI: string, params: T | null, queryOptions: QueryOptions): Promise<TResponse> {
  const { datasourceUrl, headers = {} } = queryOptions;

  let url = `${datasourceUrl}${apiURI}`;
  if (params) {
    url += '?' + new URLSearchParams(params);
  }
  const init = {
    method: 'GET',
    headers,
  };

  return executeRequest<TResponse>(url, init);
}

function fetchWithPost<T, TResponse>(
  apiURI: string,
  params: T | null,
  queryOptions: QueryOptions,
  body: Record<string, string | number>
): Promise<TResponse> {
  const { datasourceUrl, headers = {} } = queryOptions;

  let url = `${datasourceUrl}${apiURI}`;
  if (params) {
    url += '?' + new URLSearchParams(params);
  }
  const init = {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  };

  return executeRequest<TResponse>(url, init);
}

/**
 * Returns profiling data.
 */
export function searchProfiles(
  params: SearchProfilesParameters,
  queryOptions: QueryOptions
): Promise<SearchProfilesResponse> {
  return fetchWithGet<SearchProfilesParameters, SearchProfilesResponse>('/pyroscope/render', params, queryOptions);
}

/**
 * Returns a list of all profile types.
 */
export function searchProfileTypes(
  params: SearchProfileTypesParameters,
  queryOptions: QueryOptions,
  body: Record<string, string | number>
): Promise<SearchProfileTypesResponse> {
  return fetchWithPost<SearchProfileTypesParameters, SearchProfileTypesResponse>(
    '/querier.v1.QuerierService/ProfileTypes',
    params,
    queryOptions,
    body
  );
}

/**
 * Returns a list of all label names.
 */
export function searchLabelNames(
  params: SearchLabelNamesParameters,
  queryOptions: QueryOptions,
  body: Record<string, string | number>
): Promise<SearchLabelNamesResponse> {
  return fetchWithPost<SearchLabelNamesParameters, SearchLabelNamesResponse>(
    '/querier.v1.QuerierService/LabelNames',
    params,
    queryOptions,
    body
  );
}

/**
 * Returns a list of all label values for a given label name.
 */
export function searchLabelValues(
  params: SearchLabelValuesParameters,
  queryOptions: QueryOptions,
  body: Record<string, string | number>
): Promise<SearchLabelValuesResponse> {
  return fetchWithPost<SearchLabelValuesParameters, SearchLabelValuesResponse>(
    '/querier.v1.QuerierService/LabelValues',
    params,
    queryOptions,
    body
  );
}

/**
 * Returns a list of all services.
 * This is a special case of label values where the label name is "service_name".
 */
export function searchServices(
  params: SearchLabelValuesParameters,
  queryOptions: QueryOptions
): Promise<SearchLabelValuesResponse> {
  return fetchWithPost<SearchLabelValuesParameters, SearchLabelValuesResponse>(
    '/querier.v1.QuerierService/LabelValues',
    params,
    queryOptions,
    { name: 'service_name' }
  );
}
