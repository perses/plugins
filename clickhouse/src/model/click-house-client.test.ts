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

import { formatClickHouseDateTime, query, replaceTimeRangePlaceholders } from './click-house-client';

describe('ClickHouse client', () => {
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

  it('should format time range dates for ClickHouse SQL literals', () => {
    expect(formatClickHouseDateTime(new Date('2025-01-01T00:00:00.000Z'))).toBe('2025-01-01 00:00:00');
  });

  it('should send interpolated query to ClickHouse', async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Pick<Response, 'ok' | 'json'>>>(async () => ({
      ok: true,
      json: vi.fn(async () => ({ data: [] })),
    }));
    global.fetch = fetchMock as unknown as typeof fetch;

    await query(
      {
        query: "SELECT * FROM logs WHERE timestamp BETWEEN '{start}' AND '{end}'",
        start: '2025-01-01 00:00:00',
        end: '2025-01-02 00:00:00',
      },
      {
        datasourceUrl: 'http://clickhouse.example.com',
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl] = fetchMock.mock.calls[0]!;
    const url = new URL(calledUrl);
    expect(url.searchParams.get('query')).toBe(
      "SELECT * FROM logs WHERE timestamp BETWEEN '2025-01-01 00:00:00' AND '2025-01-02 00:00:00' FORMAT JSON",
    );
  });

  it.each([
    [
      'SELECT format, count() FROM logs GROUP BY format',
      'SELECT format, count() FROM logs GROUP BY format FORMAT JSON',
    ],
    ["SELECT if(x, 'FORMAT', 'other') FROM logs", "SELECT if(x, 'FORMAT', 'other') FROM logs FORMAT JSON"],
    [
      'SELECT format, count() FROM logs GROUP BY format ORDER BY format DESC',
      'SELECT format, count() FROM logs GROUP BY format ORDER BY format DESC FORMAT JSON',
    ],
    ['SELECT * FROM logs FORMAT JSONCompact', 'SELECT * FROM logs FORMAT JSONCompact'],
    ['select * from logs format JSON;', 'select * from logs format JSON;'],
  ])('should append FORMAT JSON only when the query does not end with a FORMAT clause: %s', async (input, expected) => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Pick<Response, 'ok' | 'json'>>>(async () => ({
      ok: true,
      json: vi.fn(async () => ({ data: [] })),
    }));

    await query({ query: input }, { datasourceUrl: 'http://clickhouse.example.com', fetch: fetchMock as never });

    const [calledUrl] = fetchMock.mock.calls[0]!;
    expect(new URL(calledUrl).searchParams.get('query')).toBe(expected);
  });

  it('should reject with the ClickHouse error when the response is not ok', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: vi.fn(async () => 'Code: 62. DB::Exception: Syntax error'),
    }));

    await expect(
      query({ query: 'SELEC 1' }, { datasourceUrl: 'http://clickhouse.example.com', fetch: fetchMock as never }),
    ).rejects.toThrow('400 Bad Request: Code: 62. DB::Exception: Syntax error');
  });
});
