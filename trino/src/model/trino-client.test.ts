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

import {
  MAX_ROWS,
  formatTrinoDateTime,
  parseTrinoTimestamp,
  query,
  replaceTimeRangePlaceholders,
} from './trino-client';

type FakeResponse = Pick<Response, 'ok' | 'status' | 'json' | 'text'>;
type FetchMock = ReturnType<typeof vi.fn<(url: string, init?: RequestInit) => Promise<FakeResponse>>>;

function page(body: unknown, status = 200): FakeResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => `status ${status}`,
  };
}

// Answers by URL and method so a wrong poll target or verb fails instead of getting the next canned page.
function trinoServer(routes: Record<string, FakeResponse | FakeResponse[]>): FetchMock {
  const queues = new Map(
    Object.entries(routes).map(([key, value]) => [key, Array.isArray(value) ? [...value] : [value]]),
  );
  return vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url}`;
    const queue = queues.get(key);
    if (!queue || queue.length === 0) throw new Error(`unexpected request ${key}`);
    return queue.length > 1 ? queue.shift()! : queue[0]!;
  });
}

const DIRECT = 'http://trino.example.com';

describe('Trino client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should replace time range placeholders', () => {
    expect(
      replaceTimeRangePlaceholders(
        "SELECT * FROM logs WHERE ts BETWEEN TIMESTAMP '{start}' AND TIMESTAMP '{end}'",
        '2025-01-01 00:00:00',
        '2025-01-02 00:00:00',
      ),
    ).toEqual(
      "SELECT * FROM logs WHERE ts BETWEEN TIMESTAMP '2025-01-01 00:00:00' AND TIMESTAMP '2025-01-02 00:00:00'",
    );
  });

  it('should format time range dates for Trino SQL literals', () => {
    expect(formatTrinoDateTime(new Date('2025-01-01T00:00:00.000Z'))).toBe('2025-01-01 00:00:00');
  });

  it.each([
    ['2025-01-01 00:00:00', '2025-01-01T00:00:00.000Z'],
    ['2025-01-01 00:00:00.123456789', '2025-01-01T00:00:00.123Z'],
    ['2025-01-01 00:00:00.5 UTC', '2025-01-01T00:00:00.500Z'],
    ['2025-01-01 05:30:00 +05:30', '2025-01-01T00:00:00.000Z'],
    ['2025-01-01', '2025-01-01T00:00:00.000Z'],
    ['2025-01-01 00:00:00.000 America/New_York', '2025-01-01T05:00:00.000Z'],
    ['2025-07-01 00:00:00.000 America/New_York', '2025-07-01T04:00:00.000Z'],
    ['2026-03-08 03:30:00.000 America/New_York', '2026-03-08T07:30:00.000Z'],
  ])('parses Trino timestamp %s as %s', (value, expected) => {
    expect(parseTrinoTimestamp(value)).toBe(Date.parse(expected));
  });

  it.each([null, undefined, '', 'yesterday', '2025-01-01 00:00:00 Not/AZone'])(
    'returns NaN for unparseable timestamp %s',
    (value) => {
      expect(parseTrinoTimestamp(value)).toBeNaN();
    },
  );

  it('posts the interpolated query with the configured headers', async () => {
    const fetchMock = trinoServer({
      [`POST ${DIRECT}/v1/statement`]: page({ columns: [{ name: 'answer' }], data: [[42]] }),
    });

    const result = await query(
      {
        query: "SELECT 42 WHERE TIMESTAMP '{start}' < TIMESTAMP '{end}'",
        start: '2025-01-01 00:00:00',
        end: '2025-01-02 00:00:00',
        catalog: 'iceberg',
        schema: 'analytics',
        sessionProperties: 'query_max_run_time=5m',
        source: 'perses-dashboard',
        routingGroup: 'etl',
      },
      { datasourceUrl: DIRECT, headers: { 'X-Trino-User': 'alice' }, fetch: fetchMock as unknown as typeof fetch },
    );

    expect(result).toEqual({ status: 'success', data: [{ answer: 42 }], truncated: false });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init?.body).toBe("SELECT 42 WHERE TIMESTAMP '2025-01-01 00:00:00' < TIMESTAMP '2025-01-02 00:00:00'");
    const headers = new Headers(init?.headers);
    expect(Object.fromEntries(headers.entries())).toMatchObject({
      'x-trino-user': 'alice',
      'x-trino-catalog': 'iceberg',
      'x-trino-schema': 'analytics',
      'x-trino-session': 'query_max_run_time=5m',
      'x-trino-source': 'perses-dashboard',
      'x-trino-routing-group': 'etl',
      'x-trino-time-zone': 'UTC',
    });
  });

  it('follows nextUri with GET, keeps headers, and concatenates every page', async () => {
    const fetchMock = trinoServer({
      [`POST ${DIRECT}/v1/statement`]: page({ nextUri: `${DIRECT}/v1/statement/queued/q1/1` }),
      [`GET ${DIRECT}/v1/statement/queued/q1/1`]: page({
        nextUri: `${DIRECT}/v1/statement/executing/q1/2`,
        columns: [{ name: 'n' }],
        data: [[1], [2]],
      }),
      [`GET ${DIRECT}/v1/statement/executing/q1/2`]: page({ data: [[3]] }),
    });

    const result = await query(
      { query: 'SELECT n', catalog: 'iceberg' },
      { datasourceUrl: DIRECT, headers: { 'X-Trino-User': 'alice' }, fetch: fetchMock as unknown as typeof fetch },
    );

    expect(result.data).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const [, init] of fetchMock.mock.calls) {
      const headers = new Headers(init?.headers);
      expect(headers.get('X-Trino-User')).toBe('alice');
      expect(headers.get('X-Trino-Catalog')).toBe('iceberg');
    }
  });

  it('rewrites nextUri onto the Perses proxy path, including multi-slash paths', async () => {
    const proxy = `${window.location.origin}/proxy/globaldatasources/trino`;
    const fetchMock = trinoServer({
      [`POST ${proxy}/v1/statement`]: page({
        nextUri: 'http://trino-internal:8080///evil.example/v1/statement/q/1?x=1',
      }),
      [`GET ${proxy}/evil.example/v1/statement/q/1?x=1`]: page({ columns: [{ name: 'n' }], data: [[1]] }),
    });

    const result = await query(
      { query: 'SELECT 1' },
      { datasourceUrl: '/proxy/globaldatasources/trino', fetch: fetchMock as unknown as typeof fetch },
    );

    expect(result.data).toEqual([{ n: 1 }]);
  });

  it('rejects with the Trino error from the final page', async () => {
    const fetchMock = trinoServer({
      [`POST ${DIRECT}/v1/statement`]: page({ nextUri: `${DIRECT}/v1/statement/q/1` }),
      [`GET ${DIRECT}/v1/statement/q/1`]: page({
        error: { errorName: 'COLUMN_NOT_FOUND', message: "line 1:8: Column 'x' cannot be resolved" },
      }),
    });

    await expect(
      query({ query: 'SELECT x' }, { datasourceUrl: DIRECT, fetch: fetchMock as unknown as typeof fetch }),
    ).rejects.toThrow("Trino query failed: COLUMN_NOT_FOUND: line 1:8: Column 'x' cannot be resolved");
  });

  it('rejects on a non-ok statement response', async () => {
    const fetchMock = trinoServer({ [`POST ${DIRECT}/v1/statement`]: page({}, 401) });

    await expect(
      query({ query: 'SELECT 1' }, { datasourceUrl: DIRECT, fetch: fetchMock as unknown as typeof fetch }),
    ).rejects.toThrow('Trino query failed: Trino returned 401: status 401');
  });

  it('retries a transient 503 on a result page', async () => {
    const fetchMock = trinoServer({
      [`POST ${DIRECT}/v1/statement`]: page({ nextUri: `${DIRECT}/v1/statement/q/1` }),
      [`GET ${DIRECT}/v1/statement/q/1`]: [page({}, 503), page({ columns: [{ name: 'n' }], data: [[1]] })],
    });

    const result = await query(
      { query: 'SELECT 1' },
      { datasourceUrl: DIRECT, fetch: fetchMock as unknown as typeof fetch },
    );

    expect(result.data).toEqual([{ n: 1 }]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('gives up after repeated 503s and cancels the query', async () => {
    const fetchMock = trinoServer({
      [`POST ${DIRECT}/v1/statement`]: page({ nextUri: `${DIRECT}/v1/statement/q/1` }),
      [`GET ${DIRECT}/v1/statement/q/1`]: page({}, 503),
      [`DELETE ${DIRECT}/v1/statement/q/1`]: page({}, 204),
    });

    await expect(
      query({ query: 'SELECT 1' }, { datasourceUrl: DIRECT, fetch: fetchMock as unknown as typeof fetch }),
    ).rejects.toThrow('Trino returned 503');
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'GET')).toHaveLength(3);
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${DIRECT}/v1/statement/q/1`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('truncates at MAX_ROWS and cancels the remaining query', async () => {
    const bigPage = Array.from({ length: MAX_ROWS + 5 }, (_, i) => [i]);
    const fetchMock = trinoServer({
      [`POST ${DIRECT}/v1/statement`]: page({
        nextUri: `${DIRECT}/v1/statement/q/1`,
        columns: [{ name: 'n' }],
        data: bigPage,
      }),
      [`DELETE ${DIRECT}/v1/statement/q/1`]: page({}, 204),
    });

    const result = await query(
      { query: 'SELECT n' },
      { datasourceUrl: DIRECT, fetch: fetchMock as unknown as typeof fetch },
    );

    expect(result.truncated).toBe(true);
    expect(result.data).toHaveLength(MAX_ROWS);
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${DIRECT}/v1/statement/q/1`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('passes the abort signal to fetch and cancels the query when aborted', async () => {
    const controller = new AbortController();
    const fetchMock = trinoServer({
      [`POST ${DIRECT}/v1/statement`]: page({ nextUri: `${DIRECT}/v1/statement/q/1` }),
      [`DELETE ${DIRECT}/v1/statement/q/1`]: page({}, 204),
    });
    fetchMock
      .mockImplementationOnce(async () => page({ nextUri: `${DIRECT}/v1/statement/q/1` }))
      .mockImplementationOnce(async () => {
        controller.abort();
        throw new DOMException('The operation was aborted', 'AbortError');
      });

    await expect(
      query(
        { query: 'SELECT 1', signal: controller.signal },
        { datasourceUrl: DIRECT, fetch: fetchMock as unknown as typeof fetch },
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });
    const signals = fetchMock.mock.calls.map(([, init]) => [init?.method, init?.signal]);
    expect(signals).toEqual([
      ['POST', controller.signal],
      ['GET', controller.signal],
      ['DELETE', undefined],
    ]);
  });
});
