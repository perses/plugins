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

import type {
  OpenSearchDatarowsResponse,
  OpenSearchRequestHeaders,
  OpenSearchSearchRequestBody,
  OpenSearchSearchResponse,
} from './opensearch-client-types';

export interface OpenSearchPPLParams {
  query: string;
}

export interface OpenSearchApiOptions {
  datasourceUrl: string;
  headers?: OpenSearchRequestHeaders;
}

export interface OpenSearchSQLParams {
  query: string;
  filter?: unknown;
}

export interface OpenSearchSearchParams {
  index: string;
  body: OpenSearchSearchRequestBody;
}

export interface OpenSearchClient {
  options: {
    datasourceUrl: string;
  };
  ppl: (
    params: OpenSearchPPLParams,
    headers?: OpenSearchRequestHeaders,
    signal?: AbortSignal,
  ) => Promise<OpenSearchDatarowsResponse>;
  sql: (
    params: OpenSearchSQLParams,
    headers?: OpenSearchRequestHeaders,
    signal?: AbortSignal,
  ) => Promise<OpenSearchDatarowsResponse>;
  search: (
    params: OpenSearchSearchParams,
    headers?: OpenSearchRequestHeaders,
    signal?: AbortSignal,
  ) => Promise<OpenSearchSearchResponse>;
}

export class OpenSearchApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    message?: string,
  ) {
    super(message ?? buildShortMessage('API', status, body));
    this.name = 'OpenSearchApiError';
  }
}

/**
 * Label used in error messages so the user knows which API rejected the request.
 * `'API'` is a neutral fallback for a caller that constructs `OpenSearchApiError`
 * without an explicit message — unreachable today since all three transports pass
 * one, but a future caller doing so should get a generic label rather than a
 * misleading `'PPL'`.
 */
type ApiLabel = 'PPL' | 'SQL' | 'Search' | 'API';

function buildShortMessage(label: ApiLabel, status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as {
      error?: { reason?: string; details?: string; root_cause?: Array<{ reason?: string }> };
    };
    const reason = parsed?.error?.reason;
    const details = parsed?.error?.details;
    // OpenSearch often puts a generic phrase in `reason` ("Invalid Query") and the
    // actionable text in `details` ("can't resolve Symbol(name=@timestamp)"). Surface
    // both so the user can diagnose the failure. `_search` errors carry neither and
    // put the useful text in root_cause[0].reason instead.
    const rootCause = parsed?.error?.root_cause?.[0]?.reason;
    const suffix = reason && details && reason !== details ? `${reason} — ${details}` : reason || details || rootCause;
    if (suffix) {
      return `OpenSearch ${label} request failed (${status}): ${suffix}`;
    }
  } catch {
    // body wasn't JSON — fall through to the bare-status form
  }
  return `OpenSearch ${label} request failed (${status})`;
}

function buildUrl(path: string, datasourceUrl: string): URL {
  if (datasourceUrl.startsWith('http://') || datasourceUrl.startsWith('https://')) {
    return new URL(path, datasourceUrl);
  }

  let fullPath: string;
  if (datasourceUrl.endsWith('/') && path.startsWith('/')) {
    fullPath = datasourceUrl + path.slice(1);
  } else if (!datasourceUrl.endsWith('/') && !path.startsWith('/')) {
    fullPath = datasourceUrl + '/' + path;
  } else {
    fullPath = datasourceUrl + path;
  }

  return new URL(fullPath, window.location.origin);
}

async function postJson<T>(
  label: ApiLabel,
  path: string,
  body: unknown,
  options: OpenSearchApiOptions,
  signal?: AbortSignal,
): Promise<T> {
  const url = buildUrl(path, options.datasourceUrl);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new OpenSearchApiError(response.status, text, buildShortMessage(label, response.status, text));
  }

  return response.json();
}

/**
 * `_search` puts the index in the URL *path*, so an index like `../_cluster/settings`
 * would reach a different endpoint entirely. `sanitizeIndex` in build/ppl.ts is the
 * wrong filter here (it targets PPL metacharacters), so guard the path separately.
 *
 * This MUST be an allowlist, not a denylist of specific characters: the value is
 * interpolated into a URL path and then re-parsed by `new URL` (via `buildUrl`), and
 * that WHATWG parser normalises the path *after* this guard would run — it collapses
 * percent-encoded and bare dot segments (`%2e%2e`, `.`, `..`) and treats a backslash
 * as a path separator, so a denylist that only checks for literal `/`, `?`, `#`, `..`
 * misses `%2e%2e` (decodes to `..` and climbs out of the index segment to the
 * cluster-wide root) and `\` (reparsed as an authority separator, escaping the host
 * entirely). Only an allowlist of characters that OpenSearch itself permits in an
 * index name closes this off in one rule, because it rejects `%` and `\` outright
 * regardless of what they'd decode or reparse to.
 */
export function assertSafeIndexPath(index: string): void {
  const invalid = (): never => {
    throw new Error(
      `invalid OpenSearch index for a _search request: ${JSON.stringify(index)}. ` +
        'An index (or comma-separated list of indices) must be non-empty and may only contain ' +
        'letters, digits, "_", ".", "+", "-", and "*" as path segments, with no empty or ' +
        'dots-only segment.'
    );
  };

  if (!index || /[^A-Za-z0-9_.+*,-]/.test(index)) {
    invalid();
  }

  // Reject a comma-separated segment that is empty or consists only of dots — this
  // catches the bare `.` / `..` traversal forms (and a dot segment hidden inside a
  // multi-index list like `logs-*,.`) that the character allowlist above lets through,
  // since `.` is itself a legitimate character in an index name like `logs-2025.01.01`.
  for (const segment of index.split(',')) {
    if (segment === '' || /^\.+$/.test(segment)) {
      invalid();
    }
  }
}

export async function ppl(
  params: OpenSearchPPLParams,
  options: OpenSearchApiOptions,
  signal?: AbortSignal
): Promise<OpenSearchDatarowsResponse> {
  return postJson('PPL', '/_plugins/_ppl', { query: params.query }, options, signal);
}

export async function sql(
  params: OpenSearchSQLParams,
  options: OpenSearchApiOptions,
  signal?: AbortSignal
): Promise<OpenSearchDatarowsResponse> {
  const body: Record<string, unknown> = { query: params.query };
  if (params.filter !== undefined) {
    body.filter = params.filter;
  }
  return postJson('SQL', '/_plugins/_sql', body, options, signal);
}

export async function search(
  params: OpenSearchSearchParams,
  options: OpenSearchApiOptions,
  signal?: AbortSignal
): Promise<OpenSearchSearchResponse> {
  assertSafeIndexPath(params.index);
  return postJson('Search', `/${params.index}/_search`, params.body, options, signal);
}
