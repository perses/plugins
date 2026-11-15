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

import { addTrinoUserFromToken, formatTrinoDateTime, query, replaceTimeRangePlaceholders } from './trino-client';

function jwt(payload: Record<string, unknown>): string {
  const encodedPayload = btoa(JSON.stringify(payload)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  return `eyJhbGciOiJub25lIn0.${encodedPayload}.signature`;
}

describe('Trino client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should replace time range placeholders', () => {
    expect(
      replaceTimeRangePlaceholders(
        "SELECT * FROM logs WHERE timestamp BETWEEN '{start}' AND '{end}'",
        '2025-01-01 00:00:00',
        '2025-01-02 00:00:00',
      ),
    ).toEqual("SELECT * FROM logs WHERE timestamp BETWEEN '2025-01-01 00:00:00' AND '2025-01-02 00:00:00'");
  });

  it('should format time range dates for Trino SQL literals', () => {
    expect(formatTrinoDateTime(new Date('2025-01-01T00:00:00.000Z'))).toBe('2025-01-01 00:00:00');
  });

  it('sets X-Trino-User from the configured JWT claim', () => {
    const headers = new Headers({
      Authorization: `Bearer ${jwt({ sub: 'fallback', identity: { username: 'alice' } })}`,
    });

    addTrinoUserFromToken(headers, 'identity.username');

    expect(headers.get('X-Trino-User')).toBe('alice');
  });

  it('should send interpolated query to Trino', async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Pick<Response, 'ok' | 'json' | 'text'>>>(
      async () => ({
        ok: true,
        json: vi.fn(async () => ({ columns: [{ name: 'answer' }], data: [[42]] })),
        text: vi.fn(async () => ''),
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await query(
      {
        query: "SELECT * FROM logs WHERE timestamp BETWEEN '{start}' AND '{end}'",
        start: '2025-01-01 00:00:00',
        end: '2025-01-02 00:00:00',
      },
      {
        datasourceUrl: 'http://trino.example.com',
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = fetchMock.mock.calls[0]!;
    expect(calledUrl).toBe('http://trino.example.com/v1/statement');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(
      "SELECT * FROM logs WHERE timestamp BETWEEN '2025-01-01 00:00:00' AND '2025-01-02 00:00:00'",
    );
  });

  it('sends the JWT subject as X-Trino-User on statement and result requests', async () => {
    const fetchMock = vi
      .fn<(url: string, init?: RequestInit) => Promise<Pick<Response, 'ok' | 'json' | 'text'>>>()
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn(async () => ({ nextUri: 'http://trino.example.com/v1/statement/query/1' })),
        text: vi.fn(async () => ''),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn(async () => ({ columns: [{ name: 'answer' }], data: [[42]] })),
        text: vi.fn(async () => ''),
      });

    await query(
      {
        query: 'SELECT 42',
        catalog: 'iceberg',
        schema: 'analytics',
        sessionProperties: 'join_distribution_type=AUTOMATIC, query_max_run_time=5m',
        source: 'perses-dashboard',
      },
      {
        datasourceUrl: 'http://trino.example.com',
        headers: { Authorization: `Bearer ${jwt({ sub: 'alice' })}` },
        fetch: fetchMock as unknown as typeof fetch,
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, init] of fetchMock.mock.calls) {
      const headers = new Headers(init?.headers);
      expect(headers.get('X-Trino-User')).toBe('alice');
      expect(headers.get('X-Trino-Catalog')).toBe('iceberg');
      expect(headers.get('X-Trino-Schema')).toBe('analytics');
      expect(headers.get('X-Trino-Session')).toBe('join_distribution_type=AUTOMATIC, query_max_run_time=5m');
      expect(headers.get('X-Trino-Source')).toBe('perses-dashboard');
    }
  });
});
