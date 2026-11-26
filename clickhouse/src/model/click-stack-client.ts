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

import { buildUrl } from './url';

/** Path of the alerts of the ClickStack API. */
export const ALERTS_PATH = '/api/v2/alerts';
/** Path answering to any authenticated request: used to test the connection and the API key. */
export const API_ROOT_PATH = '/api/v2';
/** Maximum number of alerts read from ClickStack. */
export const MAX_ALERTS = 5000;

// Number of alerts per request: the most the API returns.
const PAGE_SIZE = 1000;
const MAX_ERROR_LENGTH = 300;

/** States of a ClickStack alert. ClickStack only ever sets the first three. */
export const CLICKSTACK_ALERT_STATES = ['ALERT', 'PENDING', 'OK', 'INSUFFICIENT_DATA', 'DISABLED'] as const;
export type ClickStackAlertState = (typeof CLICKSTACK_ALERT_STATES)[number];

/** What a ClickStack alert watches: a saved search, a tile of a dashboard, or its own chart. */
export const CLICKSTACK_ALERT_SOURCES = ['saved_search', 'tile', 'inline'] as const;
export type ClickStackAlertSource = (typeof CLICKSTACK_ALERT_SOURCES)[number];

/** Alert, as returned by the ClickStack API. Only the fields the plugin reads are described. */
export interface ClickStackAlert {
  id: string;
  /** Name of the alert: the one it was given, or else the name of the saved search or dashboard tile it watches. */
  displayName?: string | null;
  /** Title of the notifications of the alert. It can be a template. */
  name?: string | null;
  message?: string | null;
  note?: string | null;
  tags?: string[] | null;
  source?: string | null;
  savedSearchId?: string | null;
  dashboardId?: string | null;
  tileId?: string | null;
  groupBy?: string | null;
  threshold?: number | null;
  thresholdMax?: number | null;
  thresholdType?: string | null;
  interval?: string | null;
  numConsecutiveWindows?: number | null;
  state?: string | null;
  silenced?: { by?: string | null; at?: string | null; until?: string | null } | null;
  executionErrors?: Array<{ timestamp?: string; type?: string; message?: string }> | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ClickStackAlertsParams {
  /** Only the alerts in one of these states. */
  states?: readonly string[];
  /** Only the alerts watching one of these kinds of sources. */
  sources?: readonly string[];
  /** Only the alerts with one of these tags. */
  tags?: readonly string[];
  /** Only the alerts whose name contains this text. */
  search?: string;
  signal?: AbortSignal;
}

export interface ClickStackAlertsResponse {
  alerts: ClickStackAlert[];
  /** Number of alerts matching the request. It is higher than the number of alerts when they were cut. */
  total: number;
}

export interface ClickStackClientOptions {
  datasourceUrl: string;
  headers?: RequestHeaders;
  fetch?: FetchFn;
}

export interface ClickStackClient {
  getAlerts: (params?: ClickStackAlertsParams, headers?: RequestHeaders) => Promise<ClickStackAlertsResponse>;
}

/** buildAlertsSearchParams returns the query string of an alerts request. Filters with several values are repeated. */
export function buildAlertsSearchParams(params: ClickStackAlertsParams = {}): URLSearchParams {
  const search = new URLSearchParams();
  for (const state of params.states ?? []) search.append('state', state);
  for (const source of params.sources ?? []) search.append('source', source);
  for (const tag of params.tags ?? []) search.append('tag', tag);
  if (params.search) search.set('search', params.search);
  return search;
}

function isAlert(value: unknown): value is ClickStackAlert {
  return typeof value === 'object' && value !== null && typeof (value as { id?: unknown }).id === 'string';
}

// Reads a page of alerts: `{data, meta}` for ClickStack, `{result}` for the managed service of ClickHouse Cloud.
function parsePage(body: unknown): { alerts: ClickStackAlert[]; total: number } {
  const envelope = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  const items = Array.isArray(body) ? body : (envelope.data ?? envelope.result);
  if (!Array.isArray(items)) {
    throw new Error('ClickStack did not answer with a list of alerts. Check the URL of the datasource.');
  }
  const alerts = items.filter(isAlert);
  const meta = envelope.meta;
  const total = typeof meta === 'object' && meta !== null ? Number((meta as { total?: unknown }).total) : NaN;
  return { alerts, total: Number.isFinite(total) ? total : alerts.length };
}

async function toError(response: Response): Promise<Error> {
  if (response.status === 401 || response.status === 403) {
    return new Error(
      `ClickStack rejected the API key (${response.status}). Check the secret of the datasource: it must hold a ClickStack API key as a bearer token.`,
    );
  }
  let detail = '';
  try {
    const text = await response.text();
    try {
      const body: unknown = JSON.parse(text);
      const message = typeof body === 'object' && body !== null ? (body as { message?: unknown }).message : undefined;
      detail = typeof message === 'string' ? message : text;
    } catch {
      detail = text;
    }
  } catch {
    // No body to read: the status alone is reported.
  }
  const shortened = detail.length > MAX_ERROR_LENGTH ? `${detail.slice(0, MAX_ERROR_LENGTH)}…` : detail;
  return new Error(`ClickStack request failed (${response.status}): ${shortened.trim() || response.statusText}`);
}

/** createClickStackClient returns a client of the API of ClickStack (HyperDX). */
export function createClickStackClient(options: ClickStackClientOptions): ClickStackClient {
  const { datasourceUrl, headers: defaultHeaders, fetch: customFetch } = options;

  async function getPage(
    params: ClickStackAlertsParams,
    offset: number,
    headers: RequestHeaders | undefined,
  ): Promise<{ alerts: ClickStackAlert[]; total: number }> {
    const url = buildUrl(datasourceUrl, ALERTS_PATH);
    const search = buildAlertsSearchParams(params);
    search.set('limit', String(PAGE_SIZE));
    search.set('offset', String(offset));
    url.search = search.toString();

    let response: Response;
    try {
      response = await (customFetch ?? fetch)(url.toString(), { method: 'GET', headers, signal: params.signal });
    } catch (error) {
      // The Perses fetch throws on error statuses, with the status of the response.
      const status = (error as { status?: unknown } | null)?.status;
      if (status === 401 || status === 403) throw await toError(new Response(null, { status }));
      throw error;
    }
    if (!response.ok) throw await toError(response);
    return parsePage(await response.json());
  }

  async function getAlerts(
    params: ClickStackAlertsParams = {},
    headers?: RequestHeaders,
  ): Promise<ClickStackAlertsResponse> {
    const requestHeaders = headers ?? defaultHeaders;
    const first = await getPage(params, 0, requestHeaders);
    const wanted = Math.min(first.total, MAX_ALERTS);
    if (first.alerts.length >= wanted || first.alerts.length < PAGE_SIZE) {
      return { alerts: first.alerts.slice(0, MAX_ALERTS), total: first.total };
    }
    // The first page tells how many alerts there are: the other pages are read at once.
    const offsets: number[] = [];
    for (let offset = PAGE_SIZE; offset < wanted; offset += PAGE_SIZE) offsets.push(offset);
    const pages = await Promise.all(offsets.map((offset) => getPage(params, offset, requestHeaders)));
    const alerts = [first, ...pages].flatMap((page) => page.alerts);
    return { alerts: alerts.slice(0, MAX_ALERTS), total: first.total };
  }

  return { getAlerts };
}
