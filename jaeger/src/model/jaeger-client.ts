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
  JaegerApiResponse,
  JaegerErrorResponse,
  JaegerOperation,
  JaegerOperationsResponse,
  JaegerSearchRequestParameters,
  JaegerServicesResponse,
  JaegerTracesData,
  JaegerTracesResponse,
} from './api-types';

interface JaegerClientOptions {
  datasourceUrl: string;
  headers?: RequestHeaders;
}

export interface JaegerClient extends DatasourceClient {
  options: JaegerClientOptions;
  getTrace(traceId: string, headers?: RequestHeaders): Promise<JaegerTracesData>;
  searchTraces(params: JaegerSearchRequestParameters, headers?: RequestHeaders): Promise<JaegerTracesData>;
  searchServices(headers?: RequestHeaders): Promise<JaegerApiResponse<string[]>>;
  searchOperations(service: string, headers?: RequestHeaders): Promise<JaegerApiResponse<JaegerOperation[]>>;
}

export interface QueryOptions {
  datasourceUrl: string;
  headers?: RequestHeaders;
  fetch?: FetchFn;
}

/**
 * Error raised when Jaeger answers with a non-2xx status.
 */
export class JaegerRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'JaegerRequestError';
    this.status = status;
  }
}

export const executeRequest = async <T>(
  customFetch: FetchFn | undefined,
  ...args: Parameters<typeof global.fetch>
): Promise<T> => {
  const doFetch = customFetch ?? fetch;
  const response = await doFetch(...args);
  if (!response.ok) {
    throw new JaegerRequestError(await readErrorMessage(response), response.status);
  }
  try {
    return await response.json();
  } catch (e) {
    console.error('Invalid response from server', e);
    throw new Error('Invalid response from server', { cause: e });
  }
};

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `Jaeger request failed with status ${response.status}`;
  try {
    const body: JaegerErrorResponse = JSON.parse(await response.text());
    return body.error?.message || fallback;
  } catch {
    return fallback;
  }
}

function fetchWithGet<TResponse>(
  apiURI: string,
  params: URLSearchParams,
  queryOptions: QueryOptions,
): Promise<TResponse> {
  const { datasourceUrl, headers = {}, fetch: customFetch } = queryOptions;

  let url = `${datasourceUrl}${apiURI}`;
  const urlParams = params.toString();
  if (urlParams !== '') {
    url += `?${urlParams}`;
  }

  return executeRequest<TResponse>(customFetch, url, {
    method: 'GET',
    headers,
  });
}

// Jaeger renamed the trace search parameters over time: 2.20 and later read the camelCase names, older 2.x releases
// only read the snake_case ones (and `num_traces` for the search depth). Sending every name keeps the plugin working
// on both, because a release ignores the names it does not know.
function appendParam(params: URLSearchParams, names: string[], value: string | undefined): void {
  if (value === undefined) {
    return;
  }
  names.forEach((name) => params.append(name, value));
}

function buildAttributes(params: JaegerSearchRequestParameters): string | undefined {
  const attributes: Record<string, string> = {};
  if (params.tags !== undefined) {
    // Jaeger only accepts string values.
    Object.entries(JSON.parse(params.tags) as Record<string, unknown>).forEach(([key, value]) => {
      attributes[key] = String(value);
    });
  }
  if (params.spanKind !== undefined) {
    attributes['span.kind'] = params.spanKind;
  }
  return Object.keys(attributes).length > 0 ? JSON.stringify(attributes) : undefined;
}

function buildSearchParams(params: JaegerSearchRequestParameters): URLSearchParams {
  const urlSearchParams = new URLSearchParams();
  appendParam(urlSearchParams, ['query.serviceName', 'query.service_name'], params.service);
  appendParam(urlSearchParams, ['query.operationName', 'query.operation_name'], params.operation);
  appendParam(urlSearchParams, ['query.startTimeMin', 'query.start_time_min'], params.startTime.toISOString());
  appendParam(urlSearchParams, ['query.startTimeMax', 'query.start_time_max'], params.endTime.toISOString());
  appendParam(urlSearchParams, ['query.durationMin', 'query.duration_min'], params.minDuration);
  appendParam(urlSearchParams, ['query.durationMax', 'query.duration_max'], params.maxDuration);
  appendParam(
    urlSearchParams,
    ['query.searchDepth', 'query.search_depth', 'query.num_traces'],
    params.limit?.toString(),
  );
  appendParam(urlSearchParams, ['query.attributes'], buildAttributes(params));
  return urlSearchParams;
}

export async function getTrace(traceId: string, queryOptions: QueryOptions): Promise<JaegerTracesData> {
  const response = await fetchWithGet<JaegerTracesResponse>(
    `/api/v3/traces/${encodeURIComponent(traceId)}`,
    new URLSearchParams(),
    queryOptions,
  );
  return response.result ?? {};
}

export async function searchTraces(
  params: JaegerSearchRequestParameters,
  queryOptions: QueryOptions,
): Promise<JaegerTracesData> {
  try {
    const response = await fetchWithGet<JaegerTracesResponse>(
      '/api/v3/traces',
      buildSearchParams(params),
      queryOptions,
    );
    return response.result ?? {};
  } catch (e) {
    // Jaeger answers a search without any match with a 404, which is not an error for the caller.
    if (e instanceof JaegerRequestError && e.status === 404 && /no traces found/i.test(e.message)) {
      return {};
    }
    throw e;
  }
}

export async function searchServices(queryOptions: QueryOptions): Promise<JaegerApiResponse<string[]>> {
  const response = await fetchWithGet<JaegerServicesResponse>('/api/v3/services', new URLSearchParams(), queryOptions);
  return { data: response.services ?? [] };
}

export async function searchOperations(
  service: string,
  queryOptions: QueryOptions,
): Promise<JaegerApiResponse<JaegerOperation[]>> {
  const response = await fetchWithGet<JaegerOperationsResponse>(
    '/api/v3/operations',
    new URLSearchParams({ service }),
    queryOptions,
  );
  return { data: response.operations ?? [] };
}
