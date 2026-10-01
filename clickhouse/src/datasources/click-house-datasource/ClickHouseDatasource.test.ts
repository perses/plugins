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

import { ClickHouseDatasource } from './ClickHouseDatasource';

describe('ClickHouseDatasource.createClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the custom fetch from options and not the global fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: [] }),
    });
    const globalFetchSpy = vi.spyOn(globalThis, 'fetch');

    const client = ClickHouseDatasource.createClient(
      { directUrl: 'http://clickhouse.example.com' },
      { proxyUrl: 'http://proxy:8080', fetch: mockFetch as unknown as typeof fetch },
    );

    await client.query({
      query: 'SELECT 1',
      start: '2025-01-01 00:00:00',
      end: '2025-01-02 00:00:00',
    });

    expect(mockFetch).toHaveBeenCalled();
    expect(globalFetchSpy).not.toHaveBeenCalled();
  });
});
