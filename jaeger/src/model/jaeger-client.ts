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
import {
  LEGACY_OPERATIONS_PATH,
  LEGACY_SERVICES_PATH,
  LEGACY_TRACES_PATH,
  buildLegacySearchParams,
  legacyErrorMessage,
  legacyOperations,
  legacyServices,
  legacyTracesToOTLP,
} from './legacy-api';

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
  /**
   * Whether the requests go through the Perses proxy, the only place where the allowed endpoints can reject them.
   * Defaults to true. The API v1 fallback is disabled otherwise (e.g. with `directUrl`).
   */
  viaProxy?: boolean;
}

/**
 * Error raised when Jaeger answers with a non-2xx status.
 */
export class JaegerRequestError extends Error {
  readonly status: number;
  /** Raw body of the response, empty when there is none. */
  readonly body: string;

  constructor(message: string, status: number, body = '') {
    super(message);
    this.name = 'JaegerRequestError';
    this.status = status;
    this.body = body;
  }
}

export const executeRequest = async <T>(
  customFetch: FetchFn | undefined,
  ...args: Parameters<typeof global.fetch>
): Promise<T> => {
  const doFetch = customFetch ?? fetch;
  const response = await doFetch(...args);
  if (!response.ok) {
    const body = await readBody(response);
    throw new JaegerRequestError(errorMessage(response.status, body), response.status, body);
  }
  try {
    return await response.json();
  } catch (e) {
    console.error('Invalid response from server', e);
    throw new Error('Invalid response from server', { cause: e });
  }
};

async function readBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function errorMessage(status: number, body: string): string {
  const fallback = `Jaeger request failed with status ${status}`;
  try {
    const parsed: JaegerErrorResponse = JSON.parse(body);
    return parsed.error?.message || fallback;
  } catch {
    return fallback;
  }
}

function isJson(body: string): boolean {
  try {
    JSON.parse(body);
    return true;
  } catch {
    return false;
  }
}

// The Perses proxy answers a request outside of the allowed endpoints with "you are not allowed to use this endpoint".
// Jaeger (or an auth proxy in front of it) can answer 403 as well, and that one must reach the user untouched.
function isProxyRejection(e: unknown): boolean {
  return e instanceof JaegerRequestError && e.status === 403 && /not allowed to use this endpoint/i.test(e.body);
}

// A route unknown to Jaeger answers with a non-JSON `404 page not found`, whereas the API v1 answers a missing trace
// with a JSON body.
function isMissingRoute(e: unknown): boolean {
  return e instanceof JaegerRequestError && e.status === 404 && !isJson(e.body);
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
    // Jaeger only accepts string values, and the tags are validated to be scalars when the query is resolved.
    Object.entries(JSON.parse(params.tags) as Record<string, string | number | boolean>).forEach(([key, value]) => {
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

// Datasources saved before the move to the API v3 only allow the former paths in their Perses proxy, which then answers
// the API v3 requests with a 403. For those, the client falls back to the API v1 (served by Jaeger up to 2.20) and
// remembers it, so existing datasources keep working until their allowed endpoints are updated. The memory is never
// cleared: the datasource stays on the API v1 until the page is reloaded, even once its allowed endpoints are updated.
const legacyDatasources = new Set<string>();

const ALLOWED_ENDPOINTS_HINT =
  'The Perses proxy of this datasource does not allow the Jaeger API v3, and this Jaeger does not serve the former ' +
  'API (removed in Jaeger 2.21). Add GET /api/v3/traces, GET /api/v3/services and GET /api/v3/operations to the ' +
  'allowed endpoints of the datasource.';

async function withLegacyFallback<T>(
  queryOptions: QueryOptions,
  current: () => Promise<T>,
  legacy: () => Promise<T>,
): Promise<T> {
  const { datasourceUrl, viaProxy = true } = queryOptions;
  if (!viaProxy) {
    return current();
  }
  if (!legacyDatasources.has(datasourceUrl)) {
    try {
      return await current();
    } catch (e) {
      if (!isProxyRejection(e)) {
        throw e;
      }
    }
  }

  try {
    const result = await legacy();
    legacyDatasources.add(datasourceUrl);
    return result;
  } catch (e) {
    if (isProxyRejection(e) || isMissingRoute(e)) {
      // Not a 404, so that a trace lookup does not turn the hint into "trace not found".
      throw new JaegerRequestError(ALLOWED_ENDPOINTS_HINT, 403);
    }
    throw e;
  }
}

async function legacyGet<T>(path: string, params: URLSearchParams, queryOptions: QueryOptions): Promise<T> {
  const response = await fetchWithGet<T & { errors?: Array<{ msg: string }> | null }>(path, params, queryOptions);
  const error = legacyErrorMessage(response);
  if (error !== undefined) {
    throw new Error(error);
  }
  return response;
}

export async function getTrace(traceId: string, queryOptions: QueryOptions): Promise<JaegerTracesData> {
  return withLegacyFallback(
    queryOptions,
    async () => {
      const response = await fetchWithGet<JaegerTracesResponse>(
        `/api/v3/traces/${encodeURIComponent(traceId)}`,
        new URLSearchParams(),
        queryOptions,
      );
      return response.result ?? {};
    },
    async () =>
      legacyTracesToOTLP(
        await legacyGet(`${LEGACY_TRACES_PATH}/${encodeURIComponent(traceId)}`, new URLSearchParams(), queryOptions),
      ),
  );
}

export async function searchTraces(
  params: JaegerSearchRequestParameters,
  queryOptions: QueryOptions,
): Promise<JaegerTracesData> {
  return withLegacyFallback(
    queryOptions,
    async () => {
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
    },
    async () => legacyTracesToOTLP(await legacyGet(LEGACY_TRACES_PATH, buildLegacySearchParams(params), queryOptions)),
  );
}

export async function searchServices(queryOptions: QueryOptions): Promise<JaegerApiResponse<string[]>> {
  return withLegacyFallback(
    queryOptions,
    async () => {
      const response = await fetchWithGet<JaegerServicesResponse>(
        '/api/v3/services',
        new URLSearchParams(),
        queryOptions,
      );
      return { data: response.services ?? [] };
    },
    async () => legacyServices(await legacyGet(LEGACY_SERVICES_PATH, new URLSearchParams(), queryOptions)),
  );
}

export async function searchOperations(
  service: string,
  queryOptions: QueryOptions,
): Promise<JaegerApiResponse<JaegerOperation[]>> {
  return withLegacyFallback(
    queryOptions,
    async () => {
      const response = await fetchWithGet<JaegerOperationsResponse>(
        '/api/v3/operations',
        new URLSearchParams({ service }),
        queryOptions,
      );
      return { data: response.operations ?? [] };
    },
    async () =>
      legacyOperations(await legacyGet(LEGACY_OPERATIONS_PATH, new URLSearchParams({ service }), queryOptions)),
  );
}
