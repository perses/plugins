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

// Errors of ClickHouse refusing a setting, matched on the first exception of a message only: the text of a query,
// e.g. the message of a `throwIf`, comes after it.
const READONLY_SETTING_ERROR = /^Code: 164\. DB::Exception: Cannot modify '(\w+)' setting in readonly mode/;
const SETTING_CONSTRAINT_ERROR = /^Code: 452\. DB::Exception: Setting (\w+) /;
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
// Buffers a bounded result, so that a query failing halfway answers with an error status instead of a cut result.
const WAIT_END_OF_QUERY = 'wait_end_of_query';

// Settings sent along with a query. A user restricted with `readonly = 1` can not change any, and a settings profile
// can forbid some: the client then stops sending the ones ClickHouse rejects.
const QUERY_SETTINGS: readonly Setting[] = [
  ['date_time_output_format', 'iso'],
  ['output_format_json_quote_64bit_integers', '1'],
  // One row more than the client reads: a result cut by ClickHouse always tells that it was cut.
  [ROW_LIMIT, String(MAX_ROWS + 1)],
  ['result_overflow_mode', 'break'],
  [WAIT_END_OF_QUERY, '1'],
  ['cancel_http_readonly_queries_on_client_close', '1'],
  ['enable_http_compression', '1'],
];
// Without `result_overflow_mode = break`, a result over `max_result_rows` is an error instead of being cut. Without a
// row limit, ClickHouse would buffer all of an unbounded result: it is cut by not reading its end instead.
const ROW_LIMIT_SETTINGS = [ROW_LIMIT, 'result_overflow_mode'];
// Setting keeping a query sent with POST from writing: it only lets it read data and change settings.
const GUARD = 'readonly';
const READ_ONLY_PROBE = "SELECT getSetting('readonly')";
/**
 * How long the answer of ClickHouse to the read-only probe is trusted. The user behind a datasource can change, e.g.
 * when the secret of its proxy is updated: the guard is sent again from time to time, to learn it.
 */
export const READ_ONLY_TTL_MS = 5 * 60 * 1000;

/** What the queries of a datasource taught about the settings its ClickHouse user may change. */
interface SettingsState {
  /** Settings ClickHouse refused to change, because of a settings profile. */
  rejected: Set<string>;
  /**
   * Read-only level of the user, when ClickHouse confirmed that it runs the queries of the user as read-only by
   * itself, and when it did. Only then do queries go without the guard (`readonly >= 1`), and without any setting
   * (`readonly = 1`).
   */
  readOnly?: { level: number; confirmedAt: number };
  /** Pending read-only probe, shared by the queries waiting for its answer. */
  readOnlyProbe?: Promise<number>;
}

// A client is created for each query: what the first ones learn is kept for the next ones of the same datasource and
// credentials, which would otherwise all be refused once before being sent again.
const settingsStates = new Map<string, SettingsState>();

function getSettingsState(key: string): SettingsState {
  let state = settingsStates.get(key);
  if (!state) {
    state = { rejected: new Set() };
    settingsStates.set(key, state);
  }
  return state;
}

// Read-only level ClickHouse enforces by itself on the queries of the user, as long as it is trusted.
function readOnlyLevel(state: SettingsState): number {
  const { readOnly } = state;
  if (readOnly === undefined || Date.now() - readOnly.confirmedAt >= READ_ONLY_TTL_MS) return 0;
  return readOnly.level;
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
  // The chunks of a stream are read one after the other.
  const readChunk = async (): Promise<{ text: string; truncated: boolean }> => {
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
    if (lines <= maxLines) return readChunk();
    // Closing the response stops ClickHouse from sending the rest.
    await reader.cancel().catch(() => undefined);
    return { text: text.slice(0, end), truncated: true };
  };
  return readChunk();
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
  // What ClickHouse taught about the user sending the queries: the one of their headers.
  function stateOf(headers: RequestHeaders | undefined): SettingsState {
    return getSettingsState(`${method} ${datasourceUrl} ${JSON.stringify(headers ?? {})}`);
  }

  // The settings to send with a query, given what ClickHouse refused so far.
  function allowedSettings(state: SettingsState): Setting[] {
    const level = readOnlyLevel(state);
    // A user that can not change any setting (`readonly = 1`).
    if (level === 1) return [];
    return settings.filter(([name]) => !state.rejected.has(name) && !(name === GUARD && level >= 1));
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

  // Asks ClickHouse the read-only level it runs the queries of the user with by itself. Only a read-only user can
  // send queries without the guard: it is also refused to a query that tries to lift it, or to a query whose error
  // reads like a refused setting, which must not be sent again without it.
  function probeReadOnly(state: SettingsState, headers: RequestHeaders | undefined): Promise<number> {
    // Asked once for all the queries waiting for the answer, and without their signals: aborting one of them must
    // not fail the other ones.
    state.readOnlyProbe ??= send({ query: READ_ONLY_PROBE }, headers, [])
      .then(async (response) => {
        const level = Number(parseBody(await response.text()).rows[0]?.[0]);
        if (!Number.isInteger(level) || level < 1) return 0;
        state.readOnly = { level, confirmedAt: Date.now() };
        return level;
      })
      .catch(() => 0)
      .finally(() => {
        state.readOnlyProbe = undefined;
      });
    return state.readOnlyProbe;
  }

  // Stops sending the setting ClickHouse refused to a query, if its error is about one of the settings sent with
  // it. It returns false when sending the query again would not help.
  async function dropRefusedSetting(
    state: SettingsState,
    message: string,
    sent: Setting[],
    headers: RequestHeaders | undefined,
  ): Promise<boolean> {
    const wasSent = (name: string | undefined): name is string =>
      name !== undefined && sent.some(([setting]) => setting === name);

    const exception = EXCEPTION.exec(message)?.[0] ?? '';
    const readOnly = READONLY_SETTING_ERROR.exec(exception)?.[1];
    const constrained = SETTING_CONSTRAINT_ERROR.exec(exception)?.[1];
    const refused = wasSent(readOnly) ? readOnly : constrained;
    if (!wasSent(refused)) return false;

    if (refused === GUARD || refused === readOnly) {
      // The query is sent with fewer settings only when ClickHouse confirms that it keeps it from writing.
      const level = await probeReadOnly(state, headers);
      // A setting other than the guard is only refused to a user that can not change any (`readonly = 1`).
      return refused === GUARD ? level >= 1 : level === 1;
    }
    for (const name of ROW_LIMIT_SETTINGS.includes(refused) ? [...ROW_LIMIT_SETTINGS, WAIT_END_OF_QUERY] : [refused]) {
      state.rejected.add(name);
    }
    return true;
  }

  // Sends the query again each time ClickHouse refuses a setting. Settings are checked before the query runs, so a
  // refused request did nothing, and each attempt sends at least one setting less: the retries are bounded.
  async function sendWithAllowedSettings(
    params: ClickHouseQueryParams,
    headers: RequestHeaders | undefined,
  ): Promise<Response> {
    const state = stateOf(headers);
    const sent = allowedSettings(state);
    try {
      return await send(params, headers, sent);
    } catch (error) {
      if (params.signal?.aborted) throw error;
      const message = errorText(error);
      if (await dropRefusedSetting(state, message, sent, headers)) {
        // Each attempt must send fewer settings, or the query would be refused forever.
        if (allowedSettings(state).length < sent.length) return sendWithAllowedSettings(params, headers);
      }
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
