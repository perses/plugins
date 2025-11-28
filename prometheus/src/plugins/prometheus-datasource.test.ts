// Copyright 2023 The Perses Authors
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

import { PrometheusDatasource } from './prometheus-datasource';
import { PrometheusDatasourceSpec } from './types';

describe('PrometheusDatasource query parameters', () => {
  it('should not alter the base URL', () => {
    const spec: PrometheusDatasourceSpec = {
      proxy: {
        kind: 'HTTPProxy',
        spec: {
          url: 'http://localhost:9090',
        },
      },
      queryParams: {
        engine: 'prometheus',
        tenant: 'default',
      },
    };

    const client = PrometheusDatasource.createClient(spec, { proxyUrl: 'http://proxy:8080' });

    // The client should have the original URL without query parameters
    // Query parameters will be added to individual API requests
    expect(client.options.datasourceUrl).toBe('http://proxy:8080');
  });

  it('should include query parameters in API calls', async () => {
    const spec: PrometheusDatasourceSpec = {
      directUrl: 'http://localhost:9090',
      queryParams: {
        dedup: 'false',
        timeout: '30s',
      },
    };

    const client = PrometheusDatasource.createClient(spec, {});

    // Mock the global fetch to verify the URL includes query parameters
    const mockFetch = jest.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ data: [] }),
    });
    global.fetch = mockFetch;

    // Test healthCheck includes query parameters
    if (client.healthCheck) {
      const healthCheckFn = client.healthCheck();
      await healthCheckFn;
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:9090/-/healthy?dedup=false&timeout=30s',
        expect.any(Object)
      );
    }

    mockFetch.mockClear();
  });
});
