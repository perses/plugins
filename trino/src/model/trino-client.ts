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

export const MAX_ROWS = 100000;
const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const MAX_POLL_ATTEMPTS = 3;
const RETRY_DELAY_MS = 100;

export interface TrinoQueryParams {
  query: string;
  start?: string;
  end?: string;
  catalog?: string;
  schema?: string;
  sessionProperties?: string;
  source?: string;
  routingGroup?: string;
  signal?: AbortSignal;
}

export interface TrinoQueryOptions {
  datasourceUrl: string;
  headers?: RequestHeaders;
  fetch?: FetchFn;
}

export type TrinoRow = Record<string, unknown>;

export interface TrinoQueryResponse {
  status: 'success' | 'error';
  data: TrinoRow[];
  /** True when the result was cut at MAX_ROWS and the remaining pages were cancelled. */
  truncated?: boolean;
}

export interface TrinoClient {
  query: (params: TrinoQueryParams, headers?: RequestHeaders) => Promise<TrinoQueryResponse>;
}

interface TrinoColumn {
  name: string;
}

interface TrinoError {
  message?: string;
  errorName?: string;
}

interface TrinoStatementResponse {
  nextUri?: string;
  columns?: TrinoColumn[];
  data?: unknown[][];
  error?: TrinoError;
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

const TRINO_TIMESTAMP =
  /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?)?(?:\s*(Z|[+-]\d{2}:?\d{2})|\s+([A-Za-z][\w+\-/]*))?$/;

/**
 * parseTrinoTimestamp converts a Trino date or timestamp value to epoch milliseconds, or NaN when it cannot be parsed.
 * Values without a zone are read as UTC, matching the X-Trino-Time-Zone the client sends.
 */
export function parseTrinoTimestamp(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return NaN;

  const match = value.trim().match(TRINO_TIMESTAMP);
  if (!match) return NaN;

  const [, date, time = '00:00:00', fraction = '', offset, zoneName] = match;
  const millis = fraction.padEnd(3, '0').slice(0, 3);
  const isoOffset = offset && offset !== 'Z' ? offset.replace(/^([+-]\d{2})(\d{2})$/, '$1:$2') : 'Z';
  const instant = Date.parse(`${date}T${time}.${millis}${isoOffset}`);
  if (!zoneName || zoneName === 'UTC') return instant;
  return wallTimeInZone(instant, zoneName);
}

const zoneFormatters = new Map<string, Intl.DateTimeFormat | null>();

function zoneFormatter(zone: string): Intl.DateTimeFormat | null {
  if (!zoneFormatters.has(zone)) {
    let formatter: Intl.DateTimeFormat | null;
    try {
      formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      formatter = null;
    }
    zoneFormatters.set(zone, formatter);
  }
  return zoneFormatters.get(zone) ?? null;
}

// Converts a wall-clock time (encoded as if it were UTC) in an IANA zone to the actual instant.
function wallTimeInZone(wallAsUtc: number, zone: string): number {
  const formatter = zoneFormatter(zone);
  if (!formatter) return NaN;
  const offsetAt = (instant: number): number => {
    const parts = Object.fromEntries(formatter.formatToParts(instant).map(({ type, value }) => [type, Number(value)]));
    const wall = Date.UTC(parts.year!, parts.month! - 1, parts.day, parts.hour, parts.minute, parts.second);
    return wall - (instant - (instant % 1000));
  };
  const firstGuess = wallAsUtc - offsetAt(wallAsUtc);
  return wallAsUtc - offsetAt(firstGuess);
}

/**
 * formatSessionProperties turns `name=value` entries separated by commas or line breaks into an X-Trino-Session
 * header value, URL-encoding each value as Trino decodes it. It returns undefined when there are no entries.
 */
export function formatSessionProperties(raw: string): string | undefined {
  const entries = raw
    .split(/[,\r\n]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '')
    .map((entry) => {
      const separator = entry.indexOf('=');
      const name = entry.slice(0, separator).trim();
      if (separator < 0 || name === '') {
        throw new Error(`Invalid Trino session property "${entry}": expected name=value`);
      }
      return `${name}=${encodeURIComponent(entry.slice(separator + 1).trim())}`;
    });
  return entries.length > 0 ? entries.join(',') : undefined;
}

export async function query(params: TrinoQueryParams, queryOptions: TrinoQueryOptions): Promise<TrinoQueryResponse> {
  const { datasourceUrl, headers, fetch: customFetch } = queryOptions;
  const { signal } = params;

  if (!params.query) {
    throw new Error('No query provided in params');
  }

  const doFetch = customFetch ?? fetch;
  const baseUrl = urlBuilder(datasourceUrl);
  const statementUrl = new URL('v1/statement', baseUrl.toString().endsWith('/') ? baseUrl : `${baseUrl}/`);
  const finalQuery = replaceTimeRangePlaceholders(params.query.trim(), params.start, params.end);
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Content-Type', 'text/plain; charset=utf-8');
  requestHeaders.set('X-Trino-Time-Zone', 'UTC');
  if (params.catalog) requestHeaders.set('X-Trino-Catalog', params.catalog);
  if (params.schema) requestHeaders.set('X-Trino-Schema', params.schema);
  const session = params.sessionProperties ? formatSessionProperties(params.sessionProperties) : undefined;
  if (session) requestHeaders.set('X-Trino-Session', session);
  if (params.source) requestHeaders.set('X-Trino-Source', params.source);
  if (params.routingGroup) requestHeaders.set('X-Trino-Routing-Group', params.routingGroup);

  let pendingUri: string | undefined;
  try {
    const response = await doFetch(statementUrl.toString(), {
      method: 'POST',
      headers: requestHeaders,
      body: finalQuery,
      signal,
    });
    if (!response.ok) {
      throw new Error(`Trino returned ${response.status}: ${await response.text()}`);
    }
    let body: TrinoStatementResponse = await response.json();
    let columns = body.columns;
    const rows: unknown[][] = [...(body.data ?? [])];
    let truncated = false;

    // Each page token depends on the previous response, so pages are fetched sequentially.
    // oxlint-disable no-await-in-loop
    while (body.nextUri) {
      pendingUri = body.nextUri;
      if (rows.length >= MAX_ROWS) {
        truncated = true;
        break;
      }
      body = await poll(resolveNextUri(datasourceUrl, body.nextUri), requestHeaders, doFetch, signal);
      columns ??= body.columns;
      rows.push(...(body.data ?? []));
    }
    // oxlint-enable no-await-in-loop

    if (truncated) {
      cancel(pendingUri, datasourceUrl, requestHeaders, doFetch);
    }
    pendingUri = undefined;
    if (body.error) throw new Error(formatTrinoError(body.error));

    const names = (columns ?? []).map((column) => column.name);
    return {
      status: 'success',
      data: rows.slice(0, MAX_ROWS).map((row) => Object.fromEntries(names.map((name, index) => [name, row[index]]))),
      truncated,
    };
  } catch (e) {
    cancel(pendingUri, datasourceUrl, requestHeaders, doFetch);
    if (signal?.aborted) throw e;
    throw new Error(`Trino query failed: ${e instanceof Error ? e.message : String(e)}`, { cause: e });
  }
}

async function poll(
  url: string,
  headers: Headers,
  doFetch: FetchFn,
  signal: AbortSignal | undefined,
): Promise<TrinoStatementResponse> {
  for (let attempt = 1; ; attempt++) {
    // oxlint-disable-next-line no-await-in-loop -- retries are sequential by definition.
    const response = await doFetch(url, { method: 'GET', headers, signal });
    if (response.ok) return response.json();
    if (!RETRYABLE_STATUSES.has(response.status) || attempt >= MAX_POLL_ATTEMPTS) {
      // oxlint-disable-next-line no-await-in-loop
      throw new Error(`Trino returned ${response.status}: ${await response.text()}`);
    }
    // oxlint-disable-next-line no-await-in-loop
    await delay(RETRY_DELAY_MS * attempt, signal);
  }
}

// Best effort: Trino abandons an unpolled query on its own, this only frees the cluster sooner.
function cancel(uri: string | undefined, datasourceUrl: string, headers: Headers, doFetch: FetchFn): void {
  if (!uri) return;
  doFetch(resolveNextUri(datasourceUrl, uri), { method: 'DELETE', headers }).catch(() => undefined);
}

function delay(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

function formatTrinoError(error: TrinoError): string {
  const message = error.message ?? 'Trino query failed';
  return error.errorName ? `${error.errorName}: ${message}` : message;
}

// Proxy datasources must keep the Perses proxy prefix, so only the nextUri path and query are reused.
function resolveNextUri(datasourceUrl: string, nextUri: string): string {
  if (isAbsoluteUrl(datasourceUrl)) return nextUri;
  const next = new URL(nextUri);
  const base = urlBuilder(datasourceUrl);
  const proxyPath = base.pathname.endsWith('/') ? base.pathname : `${base.pathname}/`;
  return `${base.origin}${proxyPath}${next.pathname.replace(/^\/+/, '')}${next.search}`;
}

function isAbsoluteUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

function urlBuilder(datasourceUrl: string): URL {
  if (isAbsoluteUrl(datasourceUrl)) {
    return new URL(datasourceUrl);
  }
  // if relative path (e.g. proxy url), resolve against window.location.origin
  return new URL(datasourceUrl, window.location.origin);
}
