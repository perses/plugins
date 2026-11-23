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
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 100;
const MAX_RETRY_AFTER_MS = 10000;

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
  /** Column names and Trino types from the statement API, one per name; the last duplicate wins, as in `data`. */
  columns?: TrinoColumn[];
  /** True when the result was cut at MAX_ROWS and the remaining pages were cancelled. */
  truncated?: boolean;
}

export interface TrinoClient {
  query: (params: TrinoQueryParams, headers?: RequestHeaders) => Promise<TrinoQueryResponse>;
}

export interface TrinoColumn {
  name: string;
  type: string;
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
    const response = await fetchWithRetry(
      statementUrl.toString(),
      { method: 'POST', headers: requestHeaders, body: finalQuery, signal },
      doFetch,
    );
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
      const pageResponse = await fetchWithRetry(
        resolveNextUri(datasourceUrl, body.nextUri),
        { method: 'GET', headers: requestHeaders, signal },
        doFetch,
      );
      body = await pageResponse.json();
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
      columns: Array.from(new Map((columns ?? []).map(({ name, type }) => [name, { name, type }])).values()),
      truncated,
    };
  } catch (e) {
    cancel(pendingUri, datasourceUrl, requestHeaders, doFetch);
    if (signal?.aborted) throw e;
    throw new Error(`Trino query failed: ${e instanceof Error ? e.message : String(e)}`, { cause: e });
  }
}

/**
 * healthCheck reports whether GET /v1/info succeeds and the server is no longer starting. It never throws.
 */
export async function healthCheck(queryOptions: TrinoQueryOptions): Promise<boolean> {
  const { datasourceUrl, headers, fetch: customFetch } = queryOptions;
  try {
    const baseUrl = urlBuilder(datasourceUrl);
    const infoUrl = new URL('v1/info', baseUrl.toString().endsWith('/') ? baseUrl : `${baseUrl}/`);
    const response = await (customFetch ?? fetch)(infoUrl.toString(), { method: 'GET', headers: new Headers(headers) });
    if (!response.ok) return false;
    const body: { starting?: unknown } | null = await response.json();
    return body?.starting === false;
  } catch {
    return false;
  }
}

async function fetchWithRetry(url: string, init: RequestInit, doFetch: FetchFn): Promise<Response> {
  const signal = init.signal ?? undefined;
  for (let attempt = 1; ; attempt++) {
    let response: Response;
    try {
      // oxlint-disable-next-line no-await-in-loop -- retries are sequential by definition.
      response = await doFetch(url, init);
    } catch (e) {
      // The Perses fetch throws on non-OK responses, without their headers, instead of returning them.
      const status = errorStatus(e);
      const wait = status === undefined ? undefined : retryDelay(status, null, attempt);
      if (wait === undefined) throw e;
      if (attempt >= MAX_ATTEMPTS) {
        const message = e instanceof Error ? e.message : String(e);
        throw new Error(`Trino returned ${status} after ${attempt} attempts: ${message}`, { cause: e });
      }
      // oxlint-disable-next-line no-await-in-loop -- retries are sequential by definition.
      await delay(wait, signal);
      continue;
    }
    if (response.ok) return response;
    const retryAfter = response.headers.get('Retry-After');
    const wait = retryDelay(response.status, retryAfter, attempt);
    if (wait === undefined || attempt >= MAX_ATTEMPTS) {
      const tries = attempt > 1 ? ` after ${attempt} attempts` : '';
      const hint = response.status === 429 && retryAfter ? ` (Retry-After: ${retryAfter})` : '';
      // oxlint-disable-next-line no-await-in-loop -- reading the final error body.
      throw new Error(`Trino returned ${response.status}${tries}${hint}: ${await response.text()}`);
    }
    void response.body?.cancel().catch(() => undefined);
    // oxlint-disable-next-line no-await-in-loop -- retries are sequential by definition.
    await delay(wait, signal);
  }
}

// retryDelay returns how long to wait before the next attempt, or undefined when the status is not retried.
// A 429 is retried only after a Retry-After the client can read and that is within MAX_RETRY_AFTER_MS.
function retryDelay(status: number, retryAfter: string | null, attempt: number): number | undefined {
  const backoff = RETRY_DELAY_MS * attempt;
  if (RETRYABLE_STATUSES.has(status)) return backoff;
  if (status !== 429) return undefined;
  const wait = parseRetryAfter(retryAfter);
  return wait === undefined || wait > MAX_RETRY_AFTER_MS ? undefined : Math.max(wait, backoff);
}

// errorStatus returns the HTTP status carried by an error the Perses fetch throws, if any.
function errorStatus(e: unknown): number | undefined {
  const status = typeof e === 'object' && e !== null ? (e as { status?: unknown }).status : undefined;
  return typeof status === 'number' ? status : undefined;
}

// parseRetryAfter returns the Retry-After wait in milliseconds (delta-seconds or HTTP-date), or undefined.
function parseRetryAfter(value: string | null): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  let ms: number;
  if (/^\d+$/.test(trimmed)) ms = Number(trimmed) * 1000;
  else if (/[a-z]/i.test(trimmed)) ms = Date.parse(trimmed) - Date.now();
  else return undefined;
  return Number.isNaN(ms) ? undefined : Math.max(ms, 0);
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
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
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
