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

import { OpenSearchDatasource } from './OpenSearchDatasource';

describe('OpenSearchDatasource.createClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the custom fetch from options and not the global fetch', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ schema: [], datarows: [] }),
    });
    const globalFetchSpy = vi.spyOn(globalThis, 'fetch');

    const client = OpenSearchDatasource.createClient(
      { directUrl: 'http://localhost:9200' },
      { proxyUrl: 'http://proxy:8080', fetch: mockFetch as unknown as typeof fetch },
    );

    await client.ppl({ query: 'source=logs-*' });

    expect(mockFetch).toHaveBeenCalled();
    expect(globalFetchSpy).not.toHaveBeenCalled();
  });
});
