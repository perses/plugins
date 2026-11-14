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

export interface TrinoQueryParams {
  query: string;
  start?: string;
  end?: string;
  database?: string;
}

export interface TrinoQueryOptions {
  datasourceUrl: string;
  headers?: RequestHeaders;
  fetch?: FetchFn;
}

export interface TrinoQueryResponse {
  status: 'success' | 'error';
  data: unknown;
}

export interface TrinoClient {
  query: (params: { start: string; end: string; query: string }) => Promise<TrinoQueryResponse>;
}

export function replaceTimeRangePlaceholders(sql: string, start?: string, end?: string): string {
  return sql.replaceAll('{start}', start ?? '{start}').replaceAll('{end}', end ?? '{end}');
}

export function formatTrinoDateTime(date: Date): string {
  return date
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, '');
}

export async function query(
  params: TrinoQueryParams,
  queryOptions: TrinoQueryOptions,
): Promise<TrinoQueryResponse> {
  const { datasourceUrl, headers, fetch: customFetch } = queryOptions;

  if (!params.query) {
    throw new Error('No query provided in params');
  }

  const baseUrl = urlBuilder(datasourceUrl);
  const statementUrl = new URL('v1/statement', baseUrl.toString().endsWith('/') ? baseUrl : `${baseUrl}/`);
  const finalQuery = replaceTimeRangePlaceholders(params.query.trim(), params.start, params.end);
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Content-Type', 'text/plain; charset=utf-8');

  try {
    const doFetch = customFetch ?? fetch;
    let response = await doFetch(statementUrl.toString(), { method: 'POST', headers: requestHeaders, body: finalQuery });
    if (!response.ok) {
      throw new Error(`Trino returned ${response.status}: ${await response.text()}`);
    }
    let body = await response.json();
    let columns = body.columns;
    const rows: unknown[][] = [...(body.data ?? [])];
    // Trino streams results through nextUri. For proxy datasources retain the Perses proxy prefix.
    // Trino provides the next page token only after the previous page completes.
    // oxlint-disable no-await-in-loop -- each page token depends on the previous response.
    while (body.nextUri) {
      const next = new URL(body.nextUri);
      const base = urlBuilder(datasourceUrl);
      const proxyPath = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`;
      const nextPath = next.pathname.replace(/^\//, '');
      const pollUrl = datasourceUrl.startsWith('http://') || datasourceUrl.startsWith('https://')
        ? next
        : new URL(nextPath + next.search, `${base.origin}${proxyPath}`);
      response = await doFetch(pollUrl.toString(), { method: 'GET', headers: requestHeaders });
      if (!response.ok) throw new Error(`Trino returned ${response.status}: ${await response.text()}`);
      body = await response.json();
      columns ??= body.columns;
      rows.push(...(body.data ?? []));
    }
    // oxlint-enable no-await-in-loop
    if (body.error) throw new Error(body.error.message ?? 'Trino query failed');
    const names: string[] = (columns ?? []).map((column: { name: string }) => column.name);
    return {
      status: 'success',
      data: rows.map((row) => Object.fromEntries(names.map((name, index) => [name, row[index]]))),
    };
  } catch (e) {
    throw new Error(`Trino query failed: ${e}`, { cause: e });
  }
}

function urlBuilder(datasourceUrl: string): URL {
  if (datasourceUrl.startsWith('http://') || datasourceUrl.startsWith('https://')) {
    return new URL(datasourceUrl);
  }
  // if relative path (e.g. proxy url), resolve against window.location.origin
  return new URL(datasourceUrl, window.location.origin);
}
