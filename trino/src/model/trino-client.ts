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
  userClaim?: string;
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

/** Sets X-Trino-User from the configured claim in a bearer JWT, when present. */
export function addTrinoUserFromToken(headers: Headers, userClaim = 'sub'): void {
  const claimPath = userClaim.trim() || 'sub';
  const authorization = headers.get('Authorization');
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) return;

  const tokenParts = match[1].split('.');
  if (tokenParts.length !== 3) {
    throw new Error('Authorization bearer token must be a JWT to derive X-Trino-User');
  }

  const encodedPayload = tokenParts[1];
  if (!encodedPayload) throw new Error('Authorization bearer token has no JWT payload');
  const base64Payload = encodedPayload.replaceAll('-', '+').replaceAll('_', '/');
  const paddedPayload = base64Payload.padEnd(Math.ceil(base64Payload.length / 4) * 4, '=');
  let payload: unknown;
  try {
    const bytes = Uint8Array.from(atob(paddedPayload), (character) => character.charCodeAt(0));
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch (e) {
    throw new Error('Authorization bearer token has an invalid JWT payload', { cause: e });
  }

  const claimValue = claimPath
    .split('.')
    .filter(Boolean)
    .reduce<unknown>(
      (value, key) =>
        typeof value === 'object' && value !== null ? (value as Record<string, unknown>)[key] : undefined,
      payload,
    );

  if (typeof claimValue !== 'string' && typeof claimValue !== 'number') {
    throw new Error(`JWT claim "${claimPath}" is missing or is not a string or number`);
  }
  headers.set('X-Trino-User', String(claimValue));
}

export async function query(params: TrinoQueryParams, queryOptions: TrinoQueryOptions): Promise<TrinoQueryResponse> {
  const { datasourceUrl, headers, userClaim, fetch: customFetch } = queryOptions;

  if (!params.query) {
    throw new Error('No query provided in params');
  }

  const baseUrl = urlBuilder(datasourceUrl);
  const statementUrl = new URL('v1/statement', baseUrl.toString().endsWith('/') ? baseUrl : `${baseUrl}/`);
  const finalQuery = replaceTimeRangePlaceholders(params.query.trim(), params.start, params.end);
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Content-Type', 'text/plain; charset=utf-8');
  addTrinoUserFromToken(requestHeaders, userClaim);

  try {
    const doFetch = customFetch ?? fetch;
    let response = await doFetch(statementUrl.toString(), {
      method: 'POST',
      headers: requestHeaders,
      body: finalQuery,
    });
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
      const pollUrl =
        datasourceUrl.startsWith('http://') || datasourceUrl.startsWith('https://')
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
