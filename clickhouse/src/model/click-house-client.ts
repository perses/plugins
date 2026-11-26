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

import type { ClickHouseColumn } from './click-house-types';
import { buildUrl } from './url';

/**
 * Maximum number of rows read from a result. ClickHouse stops the query once it has produced them, when it accepts
 * the settings asking for it. The rest of a longer result is not downloaded.
 */
export const MAX_ROWS = 100_000;
// The names and the types of the columns come before the rows.
const HEADER_LINES = 2;

/**
 * Format requested from ClickHouse: the column names, their types, then one compact JSON array per row.
 * Unlike `JSON`, its responses are not `application/json`, so the message of a failed query stays readable
 * for the Perses fetch, which tries to decode every JSON error body.
 */
export const RESPONSE_FORMAT = 'JSONCompactEachRowWithNamesAndTypes';

const READONLY_SETTING_ERROR = /Cannot modify '(\w+)' setting in readonly mode/;
const SETTING_CONSTRAINT_ERROR = /Code: 452\. DB::Exception: Setting (\w+) /;
const EXCEPTION = /Code: (\d+)\. DB::Exception: [^\n]*/;
const SERVER_VERSION = /\s*\(version [^)]*\(official build\)\)\s*$/;
const MAX_ERROR_LENGTH = 1000;

export interface ClickHouseQueryParams {
  /** SQL statement to run, without a FORMAT clause. */
  query: string;
  /** Database the unqualified table names are read from. Defaults to the one of the datasource. */
  database?: string;
  signal?: AbortSignal;
}

export interface ClickHouseStatistics {
  rowsRead?: number;
  bytesRead?: number;
  elapsedMs?: number;
}

export interface ClickHouseQueryResponse {
  columns: ClickHouseColumn[];
  /** One array per row, with the values in the order of the columns. */
  rows: unknown[][];
  /** Time zone of the server: the zone of the date/times that do not carry one. */
  timeZone?: string;
  /** True when the result was cut at MAX_ROWS. */
  truncated: boolean;
  statistics?: ClickHouseStatistics;
}

export interface ClickHouseClientOptions {
  datasourceUrl: string;
  /** Database the unqualified table names are read from. */
  database?: string;
  headers?: RequestHeaders;
  fetch?: FetchFn;
  /** HTTP method of the queries. ClickHouse only runs read queries sent with GET, but limits their size. */
  method?: 'GET' | 'POST';
  /** Asks ClickHouse for CORS headers. Needed when the browser calls it directly, without the Perses proxy. */
  cors?: boolean;
}

export interface ClickHouseClient {
  query: (params: ClickHouseQueryParams, headers?: RequestHeaders) => Promise<ClickHouseQueryResponse>;
  /** Reports whether ClickHouse answers. It never throws. */
  healthCheck: () => Promise<boolean>;
}

/** Error returned by ClickHouse, with its error code when the message carries one. */
export class ClickHouseError extends Error {
  readonly code?: number;

  constructor(message: string, options?: { code?: number; cause?: unknown }) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'ClickHouseError';
    this.code = options?.code;
  }
}

type Setting = readonly [name: string, value: string];

const ROW_LIMIT = 'max_result_rows';

// Settings sent along with a query. A user restricted with `readonly = 1` can not change any, and a settings profile
// can forbid some: the client then stops sending the ones ClickHouse rejects.
const QUERY_SETTINGS: readonly Setting[] = [
  ['date_time_output_format', 'iso'],
  ['output_format_json_quote_64bit_integers', '1'],
  [ROW_LIMIT, String(MAX_ROWS)],
  ['result_overflow_mode', 'break'],
  ['cancel_http_readonly_queries_on_client_close', '1'],
  ['enable_http_compression', '1'],
];
// Without `result_overflow_mode = break`, a result over `max_result_rows` is an error instead of being cut.
const ROW_LIMIT_SETTINGS = [ROW_LIMIT, 'result_overflow_mode'];
// Setting keeping a query sent with POST from writing: it only lets it read data and change settings.
const GUARD = 'readonly';
const READ_ONLY_PROBE = "SELECT getSetting('readonly')";

/** What the queries of a datasource taught about the settings its ClickHouse user may change. */
interface SettingsState {
  /** False once ClickHouse refused a setting to a user that can not change any (`readonly = 1`). */
  allowed: boolean;
  /** Settings ClickHouse refused to change. */
  rejected: Set<string>;
  /** Whether ClickHouse runs the queries of the user as read-only by itself. Not set until it is asked. */
  readOnlyUser?: Promise<boolean>;
}

// A client is created for each query: what the first ones learn is kept for the next ones of the same datasource,
// which would otherwise all be refused once before being sent again.
const settingsStates = new Map<string, SettingsState>();

function getSettingsState(key: string): SettingsState {
  let state = settingsStates.get(key);
  if (!state) {
    state = { allowed: true, rejected: new Set() };
    settingsStates.set(key, state);
  }
  return state;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function toClickHouseError(message: string, cause?: unknown): ClickHouseError {
  const exception = EXCEPTION.exec(message);
  const text = (exception?.[0] ?? message).replace(SERVER_VERSION, '').trim();
  const shortened = text.length > MAX_ERROR_LENGTH ? `${text.slice(0, MAX_ERROR_LENGTH)}…` : text;
  return new ClickHouseError(`ClickHouse query failed: ${shortened || 'unknown error'}`, {
    code: exception ? Number(exception[1]) : undefined,
    cause,
  });
}

function parseStatistics(summary: string | null): ClickHouseStatistics | undefined {
  if (!summary) return undefined;
  try {
    const values: Record<string, unknown> = JSON.parse(summary);
    const read = (key: string): number | undefined => {
      const value = Number(values[key]);
      return Number.isFinite(value) ? value : undefined;
    };
    const elapsedNs = read('elapsed_ns');
    return {
      rowsRead: read('read_rows'),
      bytesRead: read('read_bytes'),
      elapsedMs: elapsedNs === undefined ? undefined : elapsedNs / 1_000_000,
    };
  } catch {
    return undefined;
  }
}

// Reads the first lines of a response. The rest of a longer one is not downloaded: a result is only bounded by
// ClickHouse when it accepts the row limit of the client.
async function readLines(response: Response, maxLines: number): Promise<{ text: string; truncated: boolean }> {
  const reader = response.body?.getReader();
  if (!reader) return { text: await response.text(), truncated: false };
  const decoder = new TextDecoder();
  let text = '';
  let lines = 0;
  let end = 0;
  while (lines <= maxLines) {
    // oxlint-disable-next-line no-await-in-loop -- the chunks of a stream are read one after the other.
    const { done, value } = await reader.read();
    if (done) return { text: text + decoder.decode(), truncated: false };
    const chunk = decoder.decode(value, { stream: true });
    for (
      let newline = chunk.indexOf('\n');
      newline !== -1 && lines <= maxLines;
      newline = chunk.indexOf('\n', newline + 1)
    ) {
      lines++;
      if (lines === maxLines) end = text.length + newline;
    }
    text += chunk;
  }
  // Closing the response stops ClickHouse from sending the rest.
  await reader.cancel().catch(() => undefined);
  return { text: text.slice(0, end), truncated: true };
}

function parseBody(body: string): { columns: ClickHouseColumn[]; rows: unknown[][] } {
  let lines: unknown;
  try {
    // One JSON array per line: a line break never appears inside a value, where it is escaped.
    lines = JSON.parse(`[${body.trimEnd().replaceAll('\n', ',')}]`);
  } catch (error) {
    if (EXCEPTION.test(body)) throw toClickHouseError(body, error);
    throw new ClickHouseError(
      `ClickHouse did not answer in the ${RESPONSE_FORMAT} format. Remove the FORMAT clause of the query, if any.`,
      { cause: error },
    );
  }
  if (!Array.isArray(lines) || !lines.every(Array.isArray)) {
    throw new ClickHouseError(`ClickHouse did not answer in the ${RESPONSE_FORMAT} format.`);
  }
  const [names = [], types = [], ...rows] = lines as unknown[][];
  return {
    columns: names.map((name, index) => ({ name: String(name), type: String(types[index] ?? '') })),
    rows,
  };
}

/**
 * createClickHouseClient returns a client of the ClickHouse HTTP interface.
 *
 * Queries are sent with `readonly = 2` (POST) or as GET requests, which ClickHouse runs read-only, so that a query
 * can not write. A few settings make the results unambiguous and bounded: ISO date/times, quoted 64-bit integers, a
 * row limit. When the ClickHouse user is not allowed to change settings, the client stops sending them and reads
 * the results as they come: date/times are then in the time zone of the server, which the response tells.
 */
export function createClickHouseClient(options: ClickHouseClientOptions): ClickHouseClient {
  const { datasourceUrl, database, headers: defaultHeaders, fetch: customFetch, method = 'POST', cors } = options;
  const settings: Setting[] = [
    // A GET request is read-only by itself. A POST one is not: forbid everything but reads and settings.
    ...(method === 'POST' ? ([[GUARD, '2']] as const) : []),
    ...QUERY_SETTINGS,
    ...(cors ? ([['add_http_cors_header', '1']] as const) : []),
  ];
  const state = getSettingsState(`${method} ${datasourceUrl} ${JSON.stringify(defaultHeaders ?? {})}`);

  // The settings to send with a query, given what ClickHouse refused so far.
  function allowedSettings(): Setting[] {
    return state.allowed ? settings.filter(([name]) => !state.rejected.has(name)) : [];
  }

  async function send(
    params: ClickHouseQueryParams,
    headers: RequestHeaders | undefined,
    sent: Setting[],
  ): Promise<Response> {
    const url = buildUrl(datasourceUrl);
    const search = url.searchParams;
    search.set('default_format', RESPONSE_FORMAT);
    const queryDatabase = params.database ?? database;
    if (queryDatabase) search.set('database', queryDatabase);
    for (const [name, value] of sent) search.set(name, value);
    // Buffer the result, so that a query failing halfway answers with an error status instead of a cut result.
    // Not a result ClickHouse does not bound: it would buffer all of it. Such a result is cut by not reading its
    // end, and ends with the error of a query failing halfway.
    if (search.has(ROW_LIMIT)) search.set('wait_end_of_query', '1');
    if (method === 'GET') search.set('query', params.query);

    const response = await (customFetch ?? fetch)(url.toString(), {
      method,
      headers,
      body: method === 'POST' ? params.query : undefined,
      signal: params.signal,
    });
    if (!response.ok) {
      // Only reached with a fetch that does not throw on error statuses, unlike the Perses one.
      throw new Error((await response.text()) || `${response.status} ${response.statusText}`);
    }
    return response;
  }

  // Asks ClickHouse whether it runs the queries of the user as read-only by itself. Only then can queries go
  // without the guard: it is also refused to a query that tries to lift it, which must not be sent again without it.
  function isReadOnlyUser(headers: RequestHeaders | undefined): Promise<boolean> {
    // Asked once for all the queries waiting for the answer, and without their signals: aborting one of them must
    // not fail the other ones.
    state.readOnlyUser ??= send({ query: READ_ONLY_PROBE }, headers, [])
      .then(async (response) => Number(parseBody(await response.text()).rows[0]?.[0]) >= 1)
      .catch(() => {
        state.readOnlyUser = undefined;
        return false;
      });
    return state.readOnlyUser;
  }

  // Stops sending the setting ClickHouse refused to a query, if its error is about one of the settings sent with
  // it. It returns false when sending the query again would not help.
  async function dropRefusedSetting(
    message: string,
    sent: Setting[],
    headers: RequestHeaders | undefined,
  ): Promise<boolean> {
    const wasSent = (name: string | undefined): name is string =>
      name !== undefined && sent.some(([setting]) => setting === name);

    const readOnly = READONLY_SETTING_ERROR.exec(message)?.[1];
    const constrained = SETTING_CONSTRAINT_ERROR.exec(message)?.[1];
    const refused = wasSent(readOnly) ? readOnly : constrained;
    if (!wasSent(refused)) return false;

    if (refused === GUARD) {
      if (!(await isReadOnlyUser(headers))) return false;
      state.rejected.add(GUARD);
    } else if (refused === readOnly) {
      // Only a user that can not change any setting (`readonly = 1`) is refused another setting than the guard.
      state.allowed = false;
    } else {
      for (const name of ROW_LIMIT_SETTINGS.includes(refused) ? ROW_LIMIT_SETTINGS : [refused]) {
        state.rejected.add(name);
      }
    }
    return true;
  }

  // Sends the query again each time ClickHouse refuses a setting. Settings are checked before the query runs, so a
  // refused request did nothing, and each attempt sends at least one setting less: the retries are bounded.
  async function sendWithAllowedSettings(
    params: ClickHouseQueryParams,
    headers: RequestHeaders | undefined,
  ): Promise<Response> {
    const sent = allowedSettings();
    try {
      return await send(params, headers, sent);
    } catch (error) {
      if (params.signal?.aborted) throw error;
      const message = errorText(error);
      if (await dropRefusedSetting(message, sent, headers)) return sendWithAllowedSettings(params, headers);
      throw toClickHouseError(message, error);
    }
  }

  async function query(params: ClickHouseQueryParams, headers?: RequestHeaders): Promise<ClickHouseQueryResponse> {
    if (!params.query.trim()) {
      throw new Error('No query provided in params');
    }
    const response = await sendWithAllowedSettings(params, headers ?? defaultHeaders);
    const format = response.headers.get('X-ClickHouse-Format');
    if (format && format !== RESPONSE_FORMAT) {
      await response.body?.cancel().catch(() => undefined);
      throw new ClickHouseError(
        `ClickHouse answered in the ${format} format. Remove the FORMAT clause of the query: results are read as ${RESPONSE_FORMAT}.`,
      );
    }
    const { text, truncated } = await readLines(response, HEADER_LINES + MAX_ROWS);
    return {
      ...parseBody(text),
      timeZone: response.headers.get('X-ClickHouse-Timezone') ?? undefined,
      truncated,
      statistics: parseStatistics(response.headers.get('X-ClickHouse-Summary')),
    };
  }

  async function healthCheck(): Promise<boolean> {
    try {
      const response = await (customFetch ?? fetch)(buildUrl(datasourceUrl, '/ping').toString(), {
        method: 'GET',
        headers: defaultHeaders,
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  return { query, healthCheck };
}
