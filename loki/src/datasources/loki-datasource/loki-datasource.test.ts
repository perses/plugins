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

import type { LokiDatasourceSpec } from './loki-datasource-types';
import { LokiDatasource } from './LokiDatasource';

describe('LokiDatasource createClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the custom fetch provided via options and does not call the global fetch', async () => {
    const spec: LokiDatasourceSpec = { directUrl: 'http://loki:3100' };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: 'success', data: [] }),
    });
    const globalFetchSpy = vi.spyOn(globalThis, 'fetch');

    const client = LokiDatasource.createClient(spec, {
      proxyUrl: 'http://proxy:8080',
      fetch: mockFetch,
    });

    await client.labels({});

    expect(mockFetch).toHaveBeenCalled();
    expect(globalFetchSpy).not.toHaveBeenCalled();
  });
});
