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

import { ClickHouseError, createClickHouseClient, MAX_ROWS, READ_ONLY_TTL_MS } from './click-house-client';

const FORMAT = 'JSONCompactEachRowWithNamesAndTypes';

function result(lines: unknown[][], headers: Record<string, string> = {}): Response {
  return new Response(lines.map((line) => JSON.stringify(line)).join('\n') + '\n', {
    status: 200,
    headers: { 'X-ClickHouse-Format': FORMAT, ...headers },
  });
}

function failure(message: string, status = 500): Response {
  return new Response(message, { status });
}

type FetchMock = ReturnType<typeof vi.fn<typeof fetch>>;

let datasources = 0;

// The clients of a datasource share what they learn about its settings: each test queries its own datasource.
function datasourceUrl(): string {
  datasources += 1;
  return `http://clickhouse-${datasources}:8123`;
}

function refusedSetting(setting: string): Response {
  return failure(`Code: 164. DB::Exception: Cannot modify '${setting}' setting in readonly mode. (READONLY)`);
}

function calledUrl(fetchMock: FetchMock, call = 0): URL {
  return new URL(String(fetchMock.mock.calls[call]?.[0]));
}

describe('createClickHouseClient', () => {
  it('reads the columns, their types and the rows of a result', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      result(
        [
          ['time', 'value'],
          ["DateTime('UTC')", 'UInt64'],
          ['2026-01-01T00:00:00Z', '42'],
        ],
        {
          'X-ClickHouse-Timezone': 'Europe/Paris',
          'X-ClickHouse-Summary': '{"read_rows":"10","read_bytes":"80","elapsed_ns":"2500000"}',
        },
      ),
    );
    const client = createClickHouseClient({ datasourceUrl: '/proxy/globaldatasources/ch', fetch: fetchMock });

    await expect(client.query({ query: 'SELECT 1' })).resolves.toEqual({
      columns: [
        { name: 'time', type: "DateTime('UTC')" },
        { name: 'value', type: 'UInt64' },
      ],
      rows: [['2026-01-01T00:00:00Z', '42']],
      timeZone: 'Europe/Paris',
      truncated: false,
      statistics: { rowsRead: 10, bytesRead: 80, elapsedMs: 2.5 },
    });
    // A relative datasource URL is the one of the Perses proxy, on the origin of the page.
    expect(calledUrl(fetchMock).origin).toBe(window.location.origin);
    expect(calledUrl(fetchMock).pathname).toBe('/proxy/globaldatasources/ch');
  });

  it('sends queries with POST, as read-only and with the settings making results unambiguous', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => result([['a'], ['UInt8']]));
    const client = createClickHouseClient({ datasourceUrl: datasourceUrl(), database: 'otel', fetch: fetchMock });

    await client.query({ query: 'SELECT 1 AS a' });

    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('SELECT 1 AS a');
    expect(Object.fromEntries(calledUrl(fetchMock).searchParams)).toMatchObject({
      default_format: FORMAT,
      database: 'otel',
      readonly: '2',
      date_time_output_format: 'iso',
      output_format_json_quote_64bit_integers: '1',
      max_result_rows: String(MAX_ROWS + 1),
      result_overflow_mode: 'break',
      wait_end_of_query: '1',
    });
    expect(calledUrl(fetchMock).searchParams.has('query')).toBe(false);
  });

  it('sends queries in the URL with GET, which ClickHouse runs read-only', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => result([['a'], ['UInt8']]));
    const client = createClickHouseClient({ datasourceUrl: datasourceUrl(), method: 'GET', fetch: fetchMock });

    await client.query({ query: 'SELECT 1 AS a' });

    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe('GET');
    expect(init?.body).toBeUndefined();
    expect(calledUrl(fetchMock).searchParams.get('query')).toBe('SELECT 1 AS a');
    expect(calledUrl(fetchMock).searchParams.has('readonly')).toBe(false);
  });

  it('stops sending settings to a user that is not allowed to change any', async () => {
    const url = datasourceUrl();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(refusedSetting('date_time_output_format'))
      // ClickHouse runs the queries of this user as read-only by itself: they need no guard.
      .mockResolvedValueOnce(result([["getSetting('readonly')"], ['UInt64'], [1]]))
      .mockImplementation(async () => result([['a'], ['UInt8'], [1]]));

    const client = createClickHouseClient({ datasourceUrl: url, fetch: fetchMock });
    await expect(client.query({ query: 'SELECT 1 AS a' })).resolves.toMatchObject({ rows: [[1]] });
    // A client is created for each query: the next ones of the datasource go without settings at once.
    await createClickHouseClient({ datasourceUrl: url, fetch: fetchMock }).query({ query: 'SELECT 1 AS a' });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    for (const call of [2, 3]) {
      const params = calledUrl(fetchMock, call).searchParams;
      expect(params.has('readonly')).toBe(false);
      expect(params.has('date_time_output_format')).toBe(false);
      expect(params.get('default_format')).toBe(FORMAT);
    }
  });

  it('keeps the guard of a query whose error only reads like a refused setting', async () => {
    const statement =
      "SELECT throwIf(1, 'Code: 164. DB::Exception: Cannot modify ''readonly'' setting in readonly mode')";
    const fetchMock = vi.fn<typeof fetch>(async (_url, init) =>
      init?.body === statement
        ? failure(
            "Code: 395. DB::Exception: Code: 164. DB::Exception: Cannot modify 'readonly' setting in readonly mode: while executing 'FUNCTION throwIf'. (FUNCTION_THROW_IF_VALUE_IS_NON_ZERO)",
          )
        : result([['a'], ['UInt8'], [1]]),
    );
    const client = createClickHouseClient({ datasourceUrl: datasourceUrl(), fetch: fetchMock });

    await expect(client.query({ query: statement })).rejects.toMatchObject({ code: 395 });
    await client.query({ query: 'SELECT 1' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(calledUrl(fetchMock, 1).searchParams.get('readonly')).toBe('2');
  });

  it('keeps every setting when ClickHouse does not confirm that the user is read-only', async () => {
    const fetchMock = vi.fn<typeof fetch>(async (_url, init) =>
      init?.body === "SELECT getSetting('readonly')"
        ? result([["getSetting('readonly')"], ['UInt64'], ['0']])
        : refusedSetting('date_time_output_format'),
    );
    const client = createClickHouseClient({ datasourceUrl: datasourceUrl(), fetch: fetchMock });

    await expect(client.query({ query: 'SELECT 1' })).rejects.toMatchObject({ code: 164 });
    await expect(client.query({ query: 'SELECT 2' })).rejects.toMatchObject({ code: 164 });

    const guards = fetchMock.mock.calls
      .filter(([, init]) => init?.body !== "SELECT getSetting('readonly')")
      .map(([url]) => new URL(String(url)).searchParams.get('readonly'));
    expect(guards).toEqual(['2', '2']);
  });

  it('sends the guard again to other credentials, and once the read-only probe is stale', async () => {
    const url = datasourceUrl();
    const readOnlyUser = { Authorization: 'Basic cmVhZGVy' };
    const fetchMock = vi.fn<typeof fetch>(async (_url, init) => {
      const params = new URL(String(_url)).searchParams;
      const isReadOnlyUser = JSON.stringify(init?.headers) === JSON.stringify(readOnlyUser);
      if (init?.body === "SELECT getSetting('readonly')") {
        return result([["getSetting('readonly')"], ['UInt64'], [isReadOnlyUser ? '2' : '0']]);
      }
      return isReadOnlyUser && params.has('readonly') ? refusedSetting('readonly') : result([['a'], ['UInt8'], [1]]);
    });
    const now = vi.spyOn(Date, 'now').mockReturnValue(0);
    const query = (headers?: Record<string, string>): Promise<unknown> =>
      createClickHouseClient({ datasourceUrl: url, fetch: fetchMock }).query({ query: 'SELECT 1' }, headers);
    const sentGuards = (): Array<string | null> =>
      fetchMock.mock.calls
        .filter(([, init]) => init?.body === 'SELECT 1')
        .map(([input]) => new URL(String(input)).searchParams.get('readonly'));

    try {
      await query(readOnlyUser);
      await query(readOnlyUser);
      await query();
      now.mockReturnValue(READ_ONLY_TTL_MS);
      await query(readOnlyUser);
    } finally {
      now.mockRestore();
    }

    expect(sentGuards()).toEqual(['2', null, null, '2', '2', null]);
  });

  it('never sends without its read-only guard a query that tries to lift it', async () => {
    const statement = 'INSERT INTO t SETTINGS readonly = 0 VALUES (1)';
    const fetchMock = vi.fn<typeof fetch>(async (_url, init) =>
      init?.body === statement
        ? refusedSetting('readonly')
        : // ClickHouse lets this user write: the guard was refused because of the query.
          result([["getSetting('readonly')"], ['UInt64'], ['0']]),
    );
    const client = createClickHouseClient({ datasourceUrl: datasourceUrl(), fetch: fetchMock });

    await expect(client.query({ query: statement })).rejects.toMatchObject({ code: 164 });
    await client.query({ query: 'SELECT 1' });

    const guards = fetchMock.mock.calls
      .filter(([, init]) => init?.body !== "SELECT getSetting('readonly')")
      .map(([url, init]) => [init?.body, new URL(String(url)).searchParams.get('readonly')]);
    expect(guards).toEqual([
      [statement, '2'],
      ['SELECT 1', '2'],
    ]);
  });

  it('drops the row limit when a settings profile forbids it, and cuts the result itself', async () => {
    const rows = Array.from({ length: MAX_ROWS + 5 }, (_unused, index) => [index]);
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(failure('Code: 452. DB::Exception: Setting max_result_rows should not be changed.'))
      .mockImplementation(async () => result([['n'], ['UInt32'], ...rows]));
    const client = createClickHouseClient({ datasourceUrl: datasourceUrl(), fetch: fetchMock });

    const response = await client.query({ query: 'SELECT number AS n FROM numbers(200000)' });

    expect(response.rows).toHaveLength(MAX_ROWS);
    expect(response.truncated).toBe(true);
    const params = calledUrl(fetchMock, 1).searchParams;
    expect(params.has('max_result_rows')).toBe(false);
    // Without a row limit, the overflow mode would have nothing to apply to, and the result nothing to bound it.
    expect(params.has('result_overflow_mode')).toBe(false);
    expect(params.has('wait_end_of_query')).toBe(false);
    expect(params.get('date_time_output_format')).toBe('iso');
  });

  it('stops buffering the results when a settings profile forbids it', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(failure('Code: 452. DB::Exception: Setting wait_end_of_query should not be changed.'))
      .mockImplementation(async () => result([['a'], ['UInt8'], [1]]));
    const client = createClickHouseClient({ datasourceUrl: datasourceUrl(), fetch: fetchMock });

    await expect(client.query({ query: 'SELECT 1 AS a' })).resolves.toMatchObject({ rows: [[1]] });
    const params = calledUrl(fetchMock, 1).searchParams;
    expect(params.has('wait_end_of_query')).toBe(false);
    expect(params.get('max_result_rows')).toBe(String(MAX_ROWS + 1));
    expect(params.get('readonly')).toBe('2');
  });

  it.each([
    [MAX_ROWS, false],
    [MAX_ROWS + 1, true],
  ])('tells whether a result of %i rows cut by ClickHouse is truncated', async (count, truncated) => {
    const rows = Array.from({ length: count }, (_unused, index) => [index]);
    const fetchMock = vi.fn<typeof fetch>(async () => result([['n'], ['UInt32'], ...rows]));
    const client = createClickHouseClient({ datasourceUrl: datasourceUrl(), fetch: fetchMock });

    const response = await client.query({ query: 'SELECT number AS n FROM numbers(200000)' });

    expect(response.rows).toHaveLength(MAX_ROWS);
    expect(response.truncated).toBe(truncated);
  });

  it('does not download the rest of a result that ClickHouse did not cut', async () => {
    const lines = [['n'], ['UInt32'], ...Array.from({ length: 3 * MAX_ROWS }, (_unused, index) => [index])];
    const bytes = new TextEncoder().encode(lines.map((line) => JSON.stringify(line)).join('\n') + '\n');
    const chunkSize = 64 * 1024;
    let read = 0;
    let cancelled = false;
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(
          new ReadableStream<Uint8Array>({
            pull(controller): void {
              controller.enqueue(bytes.subarray(read, read + chunkSize));
              read += chunkSize;
              if (read >= bytes.length) controller.close();
            },
            cancel(): void {
              cancelled = true;
            },
          }),
          { status: 200, headers: { 'X-ClickHouse-Format': FORMAT } },
        ),
    );
    const client = createClickHouseClient({ datasourceUrl: datasourceUrl(), fetch: fetchMock });

    const response = await client.query({ query: 'SELECT number AS n FROM numbers(300000)' });

    expect(response.rows).toHaveLength(MAX_ROWS);
    expect(response.rows.at(-1)).toEqual([MAX_ROWS - 1]);
    expect(response.truncated).toBe(true);
    expect(cancelled).toBe(true);
    expect(read).toBeLessThan(bytes.length / 2);
  });

  it('reports the error of ClickHouse with its code, without the version of the server', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      failure(
        "Code: 60. DB::Exception: Unknown table expression identifier 'nope'. (UNKNOWN_TABLE) (version 26.9.1.1 (official build))\n",
        404,
      ),
    );
    const client = createClickHouseClient({ datasourceUrl: datasourceUrl(), fetch: fetchMock });

    const error = await client.query({ query: 'SELECT * FROM nope' }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ClickHouseError);
    expect(error).toMatchObject({
      code: 60,
      message:
        "ClickHouse query failed: Code: 60. DB::Exception: Unknown table expression identifier 'nope'. (UNKNOWN_TABLE)",
    });
    // A failed query is not sent again.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the error of ClickHouse when the fetch of Perses throws it', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      throw new Error('Code: 62. DB::Exception: Syntax error: failed at position 1 (SELEC). (SYNTAX_ERROR)');
    });
    const client = createClickHouseClient({ datasourceUrl: datasourceUrl(), fetch: fetchMock });

    await expect(client.query({ query: 'SELEC 1' })).rejects.toMatchObject({ code: 62 });
  });

  it('asks to remove a FORMAT clause, which changes the format of the result', async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response('{"data": []}', { status: 200, headers: { 'X-ClickHouse-Format': 'JSON' } }),
    );
    const client = createClickHouseClient({ datasourceUrl: datasourceUrl(), fetch: fetchMock });

    await expect(client.query({ query: 'SELECT 1 FORMAT JSON' })).rejects.toThrow(/Remove the FORMAT clause/);
  });
});
