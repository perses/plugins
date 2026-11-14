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

import { formatTrinoDateTime, query, replaceTimeRangePlaceholders } from './trino-client';

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

  it('should send interpolated query to Trino', async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Pick<Response, 'ok' | 'json' | 'text'>>>(async () => ({
      ok: true,
      json: vi.fn(async () => ({ columns: [{ name: 'answer' }], data: [[42]] })),
      text: vi.fn(async () => ''),
    }));
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
    expect(init?.body).toBe("SELECT * FROM logs WHERE timestamp BETWEEN '2025-01-01 00:00:00' AND '2025-01-02 00:00:00'");
  });
});
