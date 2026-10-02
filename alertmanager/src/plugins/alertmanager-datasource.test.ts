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

import { AlertManagerDatasource } from './alertmanager-datasource';

describe('AlertManagerDatasource custom fetch injection', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the custom fetch provided via options and not the default/global fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve([]),
    });
    const globalFetchSpy = vi.spyOn(globalThis, 'fetch');

    const client = AlertManagerDatasource.createClient(
      {},
      { proxyUrl: 'http://proxy:8080', fetch: mockFetch as unknown as typeof globalThis.fetch },
    );

    await client.getAlerts();

    expect(mockFetch).toHaveBeenCalled();
    expect(mockFetch.mock.calls[0]?.[0]).toBe('http://proxy:8080/api/v2/alerts');
    expect(globalFetchSpy).not.toHaveBeenCalled();
  });
});
