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

import { TempoDatasource } from './tempo-datasource';
import type { TempoDatasourceSpec } from './tempo-datasource-types';

describe('TempoDatasource createClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the custom fetchJson passed via options and not the global fetch', async () => {
    const spec: TempoDatasourceSpec = {};
    const mockFetchJson = vi.fn().mockResolvedValue({});
    const globalFetchSpy = vi.spyOn(globalThis, 'fetch');

    const client = TempoDatasource.createClient(spec, {
      proxyUrl: 'http://proxy:8080',
      fetchJson: mockFetchJson,
    });

    await client.search({ q: '{}' });

    expect(mockFetchJson).toHaveBeenCalled();
    expect(globalFetchSpy).not.toHaveBeenCalled();
  });
});
