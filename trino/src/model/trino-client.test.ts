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

import { FetchError, UserFriendlyError } from '@perses-dev/client';

import { TRINO_PROXY_HEADERS } from '../datasources/trino-datasource/TrinoDatasourceEditor';
import {
  formatSessionProperties,
  formatTrinoDateTime,
  MAX_ROWS,
  parseTrinoTimestamp,
  query,
  replaceTimeRangePlaceholders,
} from './trino-client';
import type { TrinoQueryResponse } from './trino-client';

type FakeResponse = Pick<Response, 'ok' | 'status' | 'json' | 'text' | 'headers'> & {
  body?: { cancel: () => Promise<void> } | null;
};
type FetchMock = ReturnType<typeof vi.fn<(url: string, init?: RequestInit) => Promise<FakeResponse>>>;

function page(body: unknown, status = 200, headers: Record<string, string> = {}): FakeResponse {
  return {
    headers: new Headers(headers),
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => `status ${status}`,
  };
}

function methods(fetchMock: FetchMock): Array<string | undefined> {
  return fetchMock.mock.calls.map(([, init]) => init?.method);
}

type Step = FakeResponse | Error;

// Answers by URL and method so a wrong poll target or verb fails instead of getting the next canned page.
// An Error step is thrown, as the Perses fetch does for non-OK responses.
function trinoServer(routes: Record<string, Step | Step[]>): FetchMock {
  const queues = new Map(
    Object.entries(routes).map(([key, value]) => [key, Array.isArray(value) ? [...value] : [value]]),
  );
  return vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url}`;
    const queue = queues.get(key);
    const step = queue && queue.length > 1 ? queue.shift() : queue?.[0];
    if (step === undefined) throw new Error(`unexpected request ${key}`);
    if (step instanceof Error) throw step;
    return step;
  });
}

const DIRECT = 'http://trino.example.com';

// settle runs every pending retry timer, then returns the promise for the caller to await.
async function settle<T>(promise: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync();
  return promise;
}

function unavailable(): UserFriendlyError {
  return new UserFriendlyError('unavailable', 503);
}

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

  it('returns the column names and types', async () => {
    const fetchMock = trinoServer({
      [`POST ${DIRECT}/v1/statement`]: page({
        columns: [
          { name: 'host', type: 'varchar' },
          { name: 'value', type: 'decimal(10,2)' },
        ],
        data: [['a', '1.50']],
      }),
    });

    const result = await query(
      { query: 'SELECT 1' },
      { datasourceUrl: DIRECT, fetch: fetchMock as unknown as typeof fetch },
    );

    expect(result.columns).toEqual([
      { name: 'host', type: 'varchar' },
      { name: 'value', type: 'decimal(10,2)' },
    ]);
  });

  it('keeps one column per name, the last one winning like the row data', async () => {
    const fetchMock = trinoServer({
      [`POST ${DIRECT}/v1/statement`]: page({
        columns: [
          { name: 'value', type: 'varchar' },
          { name: 'value', type: 'double' },
        ],
        data: [['x', 1]],
      }),
    });

    const result = await query(
      { query: 'SELECT 1' },
      { datasourceUrl: DIRECT, fetch: fetchMock as unknown as typeof fetch },
    );

    expect(result.columns).toEqual([{ name: 'value', type: 'double' }]);
    expect(result.data).toEqual([{ value: 1 }]);
  });

  it('posts the interpolated query with the configured headers', async () => {
    const fetchMock = trinoServer({
      [`POST ${DIRECT}/v1/statement`]: page({ columns: [{ name: 'answer', type: 'integer' }], data: [[42]] }),
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

    expect(result).toEqual({
      status: 'success',
      data: [{ answer: 42 }],
      columns: [{ name: 'answer', type: 'integer' }],
      truncated: false,
    });
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

  describe('retries', () => {
    const statement = `POST ${DIRECT}/v1/statement`;
    const pageUrl = `${DIRECT}/v1/statement/q/1`;
    const run = (fetchMock: FetchMock, signal?: AbortSignal): Promise<TrinoQueryResponse> =>
      query({ query: 'SELECT 1', signal }, { datasourceUrl: DIRECT, fetch: fetchMock as unknown as typeof fetch });

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it.each([502, 503, 504])('retries a transient %i on the initial POST', async (status) => {
      const fetchMock = trinoServer({
        [statement]: [page({}, status), page({ columns: [{ name: 'n' }], data: [[1]] })],
      });

      const result = await settle(run(fetchMock));

      expect(result.data).toEqual([{ n: 1 }]);
      expect(methods(fetchMock)).toEqual(['POST', 'POST']);
      expect(fetchMock.mock.calls[1]?.[1]?.body).toBe('SELECT 1');
    });

    it('gives up on the initial POST after repeated 503s without sending a DELETE', async () => {
      const fetchMock = trinoServer({ [statement]: page({}, 503) });

      const rejection = expect(run(fetchMock)).rejects.toThrow('Trino returned 503 after 3 attempts');
      await vi.runAllTimersAsync();
      await rejection;
      expect(methods(fetchMock)).toEqual(['POST', 'POST', 'POST']);
    });

    it('cancels the body of a response it retries', async () => {
      const cancel = vi.fn(async () => undefined);
      const fetchMock = trinoServer({
        [statement]: [{ ...page({}, 503), body: { cancel } }, page({ columns: [{ name: 'n' }], data: [[1]] })],
      });

      await settle(run(fetchMock));

      expect(cancel).toHaveBeenCalledTimes(1);
    });

    it('removes its abort listener once a retry wait ends', async () => {
      const controller = new AbortController();
      const removed = vi.spyOn(controller.signal, 'removeEventListener');
      const fetchMock = trinoServer({
        [statement]: [page({}, 503), page({ columns: [{ name: 'n' }], data: [[1]] })],
      });

      await settle(run(fetchMock, controller.signal));

      expect(removed).toHaveBeenCalledWith('abort', expect.any(Function));
    });

    it('does not retry a 400 on the initial POST', async () => {
      const fetchMock = trinoServer({ [statement]: page({}, 400) });

      await expect(run(fetchMock)).rejects.toThrow('Trino returned 400');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('waits for Retry-After on a 429 before retrying the POST', async () => {
      const fetchMock = trinoServer({
        [statement]: [page({}, 429, { 'Retry-After': '1' }), page({ columns: [{ name: 'n' }], data: [[1]] })],
      });

      const result = run(fetchMock);
      await vi.advanceTimersByTimeAsync(999);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect((await result).data).toEqual([{ n: 1 }]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('retries a 429 on a result page', async () => {
      const fetchMock = trinoServer({
        [statement]: page({ nextUri: pageUrl }),
        [`GET ${pageUrl}`]: [page({}, 429, { 'Retry-After': '1' }), page({ columns: [{ name: 'n' }], data: [[1]] })],
      });

      const result = run(fetchMock);
      await vi.advanceTimersByTimeAsync(999);
      expect(methods(fetchMock)).toEqual(['POST', 'GET']);
      await vi.advanceTimersByTimeAsync(1);
      expect((await result).data).toEqual([{ n: 1 }]);
      expect(methods(fetchMock)).toEqual(['POST', 'GET', 'GET']);
    });

    it('waits for a Retry-After at the 10 second cap', async () => {
      const fetchMock = trinoServer({
        [statement]: [page({}, 429, { 'Retry-After': '10' }), page({ columns: [{ name: 'n' }], data: [[1]] })],
      });

      const result = run(fetchMock);
      await vi.advanceTimersByTimeAsync(9999);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect((await result).data).toEqual([{ n: 1 }]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it.each([
      ['a seconds value', (): string => '11'],
      ['an HTTP-date', (): string => new Date(Date.now() + 3_600_000).toUTCString()],
    ])('fails at once when Retry-After is over the cap, for %s', async (_name, retryAfter) => {
      const value = retryAfter();
      const fetchMock = trinoServer({ [statement]: page({}, 429, { 'Retry-After': value }) });

      await expect(run(fetchMock)).rejects.toThrow(`Trino returned 429 (Retry-After: ${value})`);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it.each<[string, string | undefined]>([
      ['no', undefined],
      ...['soon', '1.5', '0.5', '-5', '12/31/2999'].map((v): [string, string] => [v, v]),
    ])('does not retry a 429 with %s Retry-After', async (_name, value) => {
      const fetchMock = trinoServer({
        [statement]: page({}, 429, value === undefined ? {} : { 'Retry-After': value }),
      });

      await expect(run(fetchMock)).rejects.toThrow('Trino returned 429');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('still pauses for the normal backoff when Retry-After is 0', async () => {
      const fetchMock = trinoServer({
        [statement]: [page({}, 429, { 'Retry-After': '0' }), page({ columns: [{ name: 'n' }], data: [[1]] })],
      });

      const result = run(fetchMock);
      await vi.advanceTimersByTimeAsync(99);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect((await result).data).toEqual([{ n: 1 }]);
    });

    it('honours an HTTP-date Retry-After', async () => {
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      const fetchMock = trinoServer({
        [statement]: [
          page({}, 429, { 'Retry-After': new Date(Date.now() + 2000).toUTCString() }),
          page({ columns: [{ name: 'n' }], data: [[1]] }),
        ],
      });

      const result = run(fetchMock);
      await vi.advanceTimersByTimeAsync(1999);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect((await result).data).toEqual([{ n: 1 }]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('gives up after three attempts on a persistent 429', async () => {
      const fetchMock = trinoServer({ [statement]: page({}, 429, { 'Retry-After': '1' }) });

      const rejection = expect(run(fetchMock)).rejects.toThrow('Trino returned 429 after 3 attempts');
      await vi.advanceTimersByTimeAsync(10000);
      await rejection;
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    describe('when fetch throws on non-OK responses', () => {
      const ok = page({ columns: [{ name: 'n' }], data: [[1]] });

      it.each([502, 503, 504])('retries a thrown %i on the initial POST', async (status) => {
        const fetchMock = trinoServer({ [statement]: [new UserFriendlyError('unavailable', status), ok] });

        const result = await settle(run(fetchMock));

        expect(result.data).toEqual([{ n: 1 }]);
        expect(methods(fetchMock)).toEqual(['POST', 'POST']);
        expect(fetchMock.mock.calls[1]?.[1]?.body).toBe('SELECT 1');
      });

      it('retries a thrown 503 on a result page', async () => {
        const fetchMock = trinoServer({
          [statement]: page({ nextUri: pageUrl }),
          [`GET ${pageUrl}`]: [unavailable(), ok],
        });

        const result = await settle(run(fetchMock));

        expect(result.data).toEqual([{ n: 1 }]);
        expect(methods(fetchMock)).toEqual(['POST', 'GET', 'GET']);
      });

      it('waits for the backoff, growing on each attempt', async () => {
        const fetchMock = trinoServer({ [statement]: [unavailable(), unavailable(), ok] });

        const result = run(fetchMock);
        await vi.advanceTimersByTimeAsync(99);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        await vi.advanceTimersByTimeAsync(199);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        await vi.advanceTimersByTimeAsync(1);
        expect((await result).data).toEqual([{ n: 1 }]);
        expect(fetchMock).toHaveBeenCalledTimes(3);
      });

      it('stops waiting when aborted during the backoff', async () => {
        const controller = new AbortController();
        const fetchMock = trinoServer({ [statement]: unavailable() });

        const rejection = expect(run(fetchMock, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
        await vi.advanceTimersByTimeAsync(50);
        controller.abort();
        await rejection;
        await vi.advanceTimersByTimeAsync(1000);
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      it('retries the FetchError thrown for an empty error body', async () => {
        const fetchMock = trinoServer({ [statement]: [new FetchError(new Response(null, { status: 503 })), ok] });

        const result = await settle(run(fetchMock));

        expect(result.data).toEqual([{ n: 1 }]);
        expect(methods(fetchMock)).toEqual(['POST', 'POST']);
      });

      it.each([400, 429])('does not retry a thrown %i', async (status) => {
        const fetchMock = trinoServer({ [statement]: new UserFriendlyError('rejected', status) });

        await expect(run(fetchMock)).rejects.toThrow('rejected');
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      it('gives up on a thrown retryable status after three attempts, keeping the original error', async () => {
        const fetchMock = trinoServer({ [statement]: unavailable() });

        const rejection = expect(run(fetchMock)).rejects.toMatchObject({
          message: 'Trino query failed: Trino returned 503 after 3 attempts: unavailable',
          cause: { cause: expect.any(UserFriendlyError) },
        });
        await vi.advanceTimersByTimeAsync(1000);
        await rejection;
        expect(fetchMock).toHaveBeenCalledTimes(3);
      });
    });

    it('ignores Retry-After on a 503', async () => {
      const fetchMock = trinoServer({
        [statement]: [page({}, 503, { 'Retry-After': '5' }), page({ columns: [{ name: 'n' }], data: [[1]] })],
      });

      const result = run(fetchMock);
      await vi.advanceTimersByTimeAsync(100);
      expect((await result).data).toEqual([{ n: 1 }]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('grows the backoff when fetch returns the error response', async () => {
      const fetchMock = trinoServer({
        [statement]: [page({}, 503), page({}, 503), page({ columns: [{ name: 'n' }], data: [[1]] })],
      });

      const result = run(fetchMock);
      await vi.advanceTimersByTimeAsync(100);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(199);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(1);
      expect((await result).data).toEqual([{ n: 1 }]);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('rejects promptly and cancels when aborted during a Retry-After wait', async () => {
      const controller = new AbortController();
      const fetchMock = trinoServer({
        [statement]: page({ nextUri: pageUrl }),
        [`GET ${pageUrl}`]: page({}, 429, { 'Retry-After': '10' }),
        [`DELETE ${pageUrl}`]: page({}, 204),
      });

      const result = run(fetchMock, controller.signal);
      const rejection = expect(result).rejects.toMatchObject({ name: 'AbortError' });
      await vi.advanceTimersByTimeAsync(1000);
      controller.abort();
      await rejection;
      expect(methods(fetchMock)).toEqual(['POST', 'GET', 'DELETE']);
      await vi.advanceTimersByTimeAsync(10000);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
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

  it.each([
    ['a=1', 'a=1'],
    ['a=1, b=x y', 'a=1,b=x%20y'],
    [
      'join_distribution_type=AUTOMATIC\nquery_max_run_time=5m\n',
      'join_distribution_type=AUTOMATIC,query_max_run_time=5m',
    ],
    ['p=a+b%c', 'p=a%2Bb%25c'],
    ['p=k=v', 'p=k%3Dv'],
    [' , \n', undefined],
  ])('formats session properties %j as %j', (raw, expected) => {
    expect(formatSessionProperties(raw)).toBe(expected);
  });

  it('rejects a session property without a name or value separator', () => {
    expect(() => formatSessionProperties('a=1\nbroken')).toThrow('Invalid Trino session property "broken"');
  });

  it('sends multiline session properties as one encoded header', async () => {
    const fetchMock = trinoServer({
      [`POST ${DIRECT}/v1/statement`]: page({ columns: [{ name: 'n' }], data: [[1]] }),
    });

    await query(
      { query: 'SELECT 1', sessionProperties: 'a=1\nb=x y' },
      { datasourceUrl: DIRECT, fetch: fetchMock as unknown as typeof fetch },
    );

    expect(new Headers(fetchMock.mock.calls[0]![1]?.headers).get('X-Trino-Session')).toBe('a=1,b=x%20y');
  });

  it('only sends headers that the default proxy allowHeaders forwards', async () => {
    const fetchMock = trinoServer({
      [`POST ${DIRECT}/v1/statement`]: page({ columns: [{ name: 'n' }], data: [[1]] }),
    });

    await query(
      {
        query: 'SELECT 1',
        catalog: 'c',
        schema: 's',
        sessionProperties: 'a=1',
        source: 'src',
        routingGroup: 'rg',
      },
      { datasourceUrl: DIRECT, headers: { 'X-Trino-User': 'u' }, fetch: fetchMock as unknown as typeof fetch },
    );

    const allowed = TRINO_PROXY_HEADERS.map((name) => name.toLowerCase());
    const sent = [...new Headers(fetchMock.mock.calls[0]![1]?.headers).keys()];
    expect(sent.filter((name) => !allowed.includes(name))).toEqual([]);
    expect(sent).toHaveLength(allowed.length);
  });

  it('keeps returning NaN for an unknown zone once it is cached', () => {
    expect(parseTrinoTimestamp('2025-01-01 00:00:00 Not/AZone')).toBeNaN();
    expect(parseTrinoTimestamp('2025-01-01 00:00:00 Not/AZone')).toBeNaN();
    expect(parseTrinoTimestamp('2025-01-01 00:00:00 Europe/Paris')).toBe(Date.parse('2024-12-31T23:00:00Z'));
  });
});
