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

import { DatasourceClient } from '@perses-dev/plugin-system';
import { fetchJson, RequestHeaders, UserFriendlyError } from '@perses-dev/client';
import * as otlptracev1 from '@perses-dev/spec/dist/dashboard/query-type/otlp/trace/v1/trace';
import {
  QueryRequestParameters,
  SearchRequestParameters,
  SearchTagsRequestParameters,
  SearchTagsResponse,
  QueryResponse,
  ServiceStats,
  SearchResponse,
  SearchTagValuesRequestParameters,
  SearchTagValuesResponse,
} from './api-types';

interface TempoClientOptions {
  datasourceUrl: string;
  headers?: RequestHeaders;
}

export interface TempoClient extends DatasourceClient {
  options: TempoClientOptions;
  // https://grafana.com/docs/tempo/latest/api_docs/
  query(params: QueryRequestParameters, headers?: RequestHeaders): Promise<QueryResponse>;
  search(params: SearchRequestParameters, headers?: RequestHeaders): Promise<SearchResponse>;
  searchWithFallback(params: SearchRequestParameters, headers?: RequestHeaders): Promise<SearchResponse>;
  searchTags(params: SearchTagsRequestParameters, headers?: RequestHeaders): Promise<SearchTagsResponse>;
  searchTagValues(params: SearchTagValuesRequestParameters, headers?: RequestHeaders): Promise<SearchTagValuesResponse>;
}

export interface QueryOptions {
  datasourceUrl: string;
  headers?: RequestHeaders;
}

async function fetchWithGet<TRequest extends RequestParams<TRequest>, TResponse>(
  apiURI: string,
  params: TRequest,
  queryOptions: QueryOptions
): Promise<TResponse> {
  const { datasourceUrl, headers = {} } = queryOptions;

  let url = `${datasourceUrl}${apiURI}`;
  const urlParams = buildSearchParams(params).toString();
  if (urlParams !== '') {
    url += '?' + urlParams;
  }
  const init = {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  };

  try {
    return await fetchJson<TResponse>(url, init);
  } catch (e) {
    // fetchJson() puts the entire response body in the error message,
    // which can be a full HTML page. Replace with a short status message.
    if (e instanceof Error && 'status' in e && /^\s*</.test(e.message)) {
      throw new UserFriendlyError(`Invalid response from server`, e.status as number);
    }
    throw e;
  }
}

type RequestParams<T> = { [K in keyof T]: string | number };

function buildSearchParams<T>(params: RequestParams<T>): URLSearchParams {
  const urlSearchParams = new URLSearchParams();
  for (const key in params) {
    const value = params[key];
    switch (typeof value) {
      case 'string':
        urlSearchParams.append(key, value);
        break;

      case 'number':
        urlSearchParams.append(key, value.toString());
        break;
    }
  }
  return urlSearchParams;
}

/**
 * Returns a summary report of traces that satisfy the query.
 */
export function search(params: SearchRequestParameters, queryOptions: QueryOptions): Promise<SearchResponse> {
  return fetchWithGet<SearchRequestParameters, SearchResponse>('/api/search', params, queryOptions);
}

interface QueryV1Response {
  batches: otlptracev1.ResourceSpan[];
}

function queryV1(params: QueryRequestParameters, queryOptions: QueryOptions): Promise<QueryV1Response> {
  return fetchWithGet<Record<string, never>, QueryV1Response>(
    `/api/traces/${encodeURIComponent(params.traceId)}`,
    {},
    queryOptions
  );
}

/**
 * Returns an entire trace.
 * Throws an 404 if trace is not found.
 */
export async function query(params: QueryRequestParameters, queryOptions: QueryOptions): Promise<QueryResponse> {
  try {
    const response = await fetchWithGet<Record<string, never>, QueryResponse>(
      `/api/v2/traces/${encodeURIComponent(params.traceId)}`,
      {},
      queryOptions
    );

    // Unlike /api/traces, /api/v2/traces returns an empty trace instead of returning a 404 error.
    if (!response.trace.resourceSpans) {
      throw new UserFriendlyError('Trace not found', 404);
    }
    return response;
  } catch (e) {
    // Existing datasources may only have /api/traces in their allowed endpoints list.
    // Fall back to the v1 API on 403 errors for backwards compatibility.
    if (e instanceof Error && 'status' in e && e.status === 403) {
      const response = await queryV1(params, queryOptions);
      return { trace: { resourceSpans: response.batches } };
    }
    throw e;
  }
}

/**
 * Returns a summary report of traces that satisfy the query.
 *
 * If the serviceStats field is missing in the response, fetches all traces
 * and calculates the serviceStats.
 *
 * Tempo computes the serviceStats field during ingestion since vParquet4,
 * this fallback is required for older block formats.
 */
export async function searchWithFallback(
  params: SearchRequestParameters,
  queryOptions: QueryOptions
): Promise<SearchResponse> {
  // Get a list of traces that satisfy the query.
  const searchResponse = await search(params, queryOptions);
  if (!searchResponse.traces || searchResponse.traces.length === 0) {
    return { traces: [] };
  }

  // exit early if fallback is not required (serviceStats are contained in the response)
  if (searchResponse.traces.every((t) => t.serviceStats)) {
    return searchResponse;
  }

  // calculate serviceStats (number of spans and errors) per service
  return {
    traces: await Promise.all(
      searchResponse.traces.map(async (trace) => {
        if (trace.serviceStats) {
          // fallback not required, serviceStats are contained in the response
          return trace;
        }

        const serviceStats: Record<string, ServiceStats> = {};
        const searchTraceIDResponse = await query({ traceId: trace.traceID }, queryOptions);

        // For every trace, get the full trace, and find the number of spans and errors.
        for (const batch of searchTraceIDResponse.trace.resourceSpans) {
          let serviceName = 'unknown';
          for (const attr of batch.resource?.attributes ?? []) {
            if (attr.key === 'service.name' && 'stringValue' in attr.value) {
              serviceName = attr.value.stringValue;
              break;
            }
          }

          const stats = serviceStats[serviceName] ?? { spanCount: 0 };
          for (const scopeSpan of batch.scopeSpans) {
            stats.spanCount += scopeSpan.spans.length;
            for (const span of scopeSpan.spans) {
              if (span.status?.code === otlptracev1.StatusCodeError) {
                stats.errorCount = (stats.errorCount ?? 0) + 1;
              }
            }
          }
          serviceStats[serviceName] = stats;
        }

        return {
          ...trace,
          serviceStats,
        };
      })
    ),
  };
}

/**
 * Returns a list of all tag names for a given scope.
 */
export function searchTags(
  params: SearchTagsRequestParameters,
  queryOptions: QueryOptions
): Promise<SearchTagsResponse> {
  return fetchWithGet<SearchTagsRequestParameters, SearchTagsResponse>('/api/v2/search/tags', params, queryOptions);
}

/**
 * Returns a list of all tag values for a given tag.
 */
export function searchTagValues(
  params: SearchTagValuesRequestParameters,
  queryOptions: QueryOptions
): Promise<SearchTagValuesResponse> {
  const { tag, ...rest } = params;
  return fetchWithGet<Omit<SearchTagValuesRequestParameters, 'tag'>, SearchTagValuesResponse>(
    `/api/v2/search/tag/${encodeURIComponent(tag)}/values`,
    rest,
    queryOptions
  );
}
