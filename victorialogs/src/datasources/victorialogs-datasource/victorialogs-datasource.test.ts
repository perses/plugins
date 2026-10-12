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

import type { VictoriaLogsDatasourceSpec } from './types';
import { VictoriaLogsDatasource } from './VictoriaLogsDatasource';

describe('VictoriaLogsDatasource createClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the custom fetch provided via options and does not call the global fetch', async () => {
    const spec: VictoriaLogsDatasourceSpec = { directUrl: 'http://victorialogs:9428' };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });
    const globalFetchSpy = vi.spyOn(globalThis, 'fetch');

    const client = VictoriaLogsDatasource.createClient(spec, {
      proxyUrl: 'http://proxy:8080',
      fetch: mockFetch,
    });

    await client.statsQueryRange({ query: 'error', start: '0', end: '1' });

    expect(mockFetch).toHaveBeenCalled();
    expect(globalFetchSpy).not.toHaveBeenCalled();
  });
});
