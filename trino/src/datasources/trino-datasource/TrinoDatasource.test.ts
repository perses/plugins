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

import { TrinoDatasource } from './TrinoDatasource';

describe('TrinoDatasource.createClient', () => {
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

    const client = TrinoDatasource.createClient(
      { directUrl: 'http://trino.example.com' },
      { proxyUrl: 'http://proxy:8080', fetch: mockFetch as unknown as typeof fetch },
    );

    await client.query({ query: 'SELECT 1' });

    expect(mockFetch).toHaveBeenCalled();
    expect(globalFetchSpy).not.toHaveBeenCalled();
  });

  it('queries the direct URL when set', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }) });

    const client = TrinoDatasource.createClient(
      { directUrl: 'http://trino.example.com' },
      { proxyUrl: 'http://proxy:8080', fetch: mockFetch as unknown as typeof fetch },
    );
    await client.query({ query: 'SELECT 1' });

    const [url] = mockFetch.mock.calls[0]!;
    expect(url).toBe('http://trino.example.com/v1/statement');
  });

  it('queries the proxy URL with the proxy headers when there is no direct URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ data: [] }) });

    const client = TrinoDatasource.createClient(
      {
        proxy: {
          kind: 'HTTPProxy',
          spec: { url: 'http://trino:8080', headers: { 'X-Trino-Catalog': 'hive', 'X-Trino-User': 'perses' } },
        },
      },
      { proxyUrl: '/proxy/globaldatasources/trino', fetch: mockFetch as unknown as typeof fetch },
    );
    await client.query({ query: 'SELECT 1' });

    const [url, init] = mockFetch.mock.calls[0]!;
    expect(url).toBe(`${window.location.origin}/proxy/globaldatasources/trino/v1/statement`);
    const headers = new Headers(init.headers);
    expect(headers.get('X-Trino-Catalog')).toBe('hive');
    expect(headers.get('X-Trino-User')).toBe('perses');
  });
});
