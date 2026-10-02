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

import type { MockedFunction } from 'vitest';

import { greptimedbQuery } from '../../model/greptimedb-client';
import { GreptimeDBDatasource } from './GreptimeDBDatasource';

vi.mock('../../model/greptimedb-client', () => ({
  greptimedbQuery: vi.fn(),
}));

const mockedQuery = greptimedbQuery as MockedFunction<typeof greptimedbQuery>;

describe('GreptimeDBDatasource.createClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedQuery.mockResolvedValue({ status: 'success', data: { output: [] } });
  });

  it('uses directUrl with spec.headers', async () => {
    const client = GreptimeDBDatasource.createClient(
      {
        directUrl: 'http://localhost:4000',
        headers: {
          Authorization: 'Bearer direct-token',
          'x-greptime-db-name': 'metrics',
        },
      },
      {},
    );

    await client.query({
      query: 'select 1',
    });

    expect(mockedQuery).toHaveBeenCalledWith(
      { query: 'select 1' },
      {
        datasourceUrl: 'http://localhost:4000',
        headers: {
          Authorization: 'Bearer direct-token',
          'x-greptime-db-name': 'metrics',
        },
      },
    );
  });

  it('lets runtime query headers override spec headers', async () => {
    const client = GreptimeDBDatasource.createClient(
      {
        directUrl: 'http://localhost:4000',
        headers: {
          Authorization: 'Bearer from-spec',
        },
      },
      {},
    );

    await client.query(
      {
        query: 'select 1',
      },
      {
        Authorization: 'Bearer runtime',
      },
    );

    expect(mockedQuery).toHaveBeenCalledWith(
      { query: 'select 1' },
      {
        datasourceUrl: 'http://localhost:4000',
        headers: {
          Authorization: 'Bearer runtime',
        },
      },
    );
  });
});

describe('GreptimeDBDatasource.createClient custom fetch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('uses the custom fetch from options and not the global fetch', async () => {
    // Use the real greptimedb-client (not the module mock above) so the request
    // reaches the actual fetch call site.
    vi.resetModules();
    vi.doUnmock('../../model/greptimedb-client');
    const { GreptimeDBDatasource: RealGreptimeDBDatasource } = await import('./GreptimeDBDatasource');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: 'success', output: [] }),
    });
    const globalFetchSpy = vi.spyOn(globalThis, 'fetch');

    const client = RealGreptimeDBDatasource.createClient(
      { directUrl: 'http://localhost:4000' },
      { proxyUrl: 'http://proxy:8080', fetch: mockFetch as unknown as typeof fetch },
    );

    await client.query({ query: 'select 1' });

    expect(mockFetch).toHaveBeenCalled();
    expect(globalFetchSpy).not.toHaveBeenCalled();
  });
});
