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

import { ClickHouseDatasource, getQueryMethod } from './ClickHouseDatasource';

describe('ClickHouseDatasource.createClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the custom fetch from options and not the global fetch', async () => {
    const mockFetch = vi.fn<typeof fetch>(async () => new Response('["a"]\n["UInt8"]\n[1]\n', { status: 200 }));
    const globalFetchSpy = vi.spyOn(globalThis, 'fetch');

    const client = ClickHouseDatasource.createClient(
      { directUrl: 'http://clickhouse.example.com', database: 'otel' },
      { proxyUrl: 'http://proxy:8080', fetch: mockFetch },
    );

    await expect(client.query({ query: 'SELECT 1 AS a' })).resolves.toMatchObject({ rows: [[1]] });

    expect(mockFetch).toHaveBeenCalled();
    expect(globalFetchSpy).not.toHaveBeenCalled();
    const url = new URL(String(mockFetch.mock.calls[0]?.[0]));
    expect(url.origin).toBe('http://clickhouse.example.com');
    expect(url.searchParams.get('database')).toBe('otel');
    // The browser calls ClickHouse directly: it needs the CORS headers.
    expect(url.searchParams.get('add_http_cors_header')).toBe('1');
  });

  it('reads the tables of the "default" database unless the datasource names another one', async () => {
    const mockFetch = vi.fn<typeof fetch>(async () => new Response('["a"]\n["UInt8"]\n[1]\n', { status: 200 }));
    const client = ClickHouseDatasource.createClient({}, { proxyUrl: '/proxy/globaldatasources/ch', fetch: mockFetch });

    await client.query({ query: 'SELECT 1 AS a' });

    expect(new URL(String(mockFetch.mock.calls[0]?.[0])).searchParams.get('database')).toBe('default');
  });

  it('fails without a URL', () => {
    expect(() => ClickHouseDatasource.createClient({}, {})).toThrow(/No URL specified/);
  });
});

describe('getQueryMethod', () => {
  it('sends queries with POST when the proxy lets them through', () => {
    expect(getQueryMethod(undefined)).toBe('POST');
    expect(getQueryMethod([])).toBe('POST');
    expect(
      getQueryMethod([
        { endpointPattern: '^/$', method: 'POST' },
        { endpointPattern: '^/ping$', method: 'GET' },
      ]),
    ).toBe('POST');
  });

  it('keeps sending them with GET through a proxy that only allows it', () => {
    expect(getQueryMethod([{ endpointPattern: '/', method: 'GET' }])).toBe('GET');
    // POST is allowed, but not on the path of the queries.
    expect(
      getQueryMethod([
        { endpointPattern: '^/$', method: 'GET' },
        { endpointPattern: '^/write$', method: 'POST' },
      ]),
    ).toBe('GET');
  });
});
