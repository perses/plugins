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

import { ppl, OpenSearchPPLError } from './opensearch-client';

describe('opensearch-client', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  function mockFetch(response: { ok: boolean; status: number; body: unknown }): jest.Mock {
    const mock = jest.fn(async () => ({
      ok: response.ok,
      status: response.status,
      text: async (): Promise<string> =>
        typeof response.body === 'string' ? response.body : JSON.stringify(response.body),
      json: async (): Promise<unknown> => response.body,
    })) as unknown as jest.Mock;
    global.fetch = mock as unknown as typeof fetch;
    return mock;
  }

  it('POSTs to /_plugins/_ppl with the right body and headers', async () => {
    const mock = mockFetch({
      ok: true,
      status: 200,
      body: { schema: [], datarows: [] },
    });

    await ppl({ query: 'source=logs-*' }, { datasourceUrl: 'http://localhost:9200' });

    expect(mock).toHaveBeenCalledTimes(1);
    const [url, init] = mock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:9200/_plugins/_ppl');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ query: 'source=logs-*' }));
  });

  it('forwards extra headers from options', async () => {
    const mock = mockFetch({ ok: true, status: 200, body: { schema: [], datarows: [] } });
    await ppl(
      { query: 'source=logs-*' },
      { datasourceUrl: 'http://localhost:9200', headers: { Authorization: 'Basic xyz' } }
    );
    const [, init] = mock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Basic xyz');
  });

  it('throws OpenSearchPPLError carrying status and body on non-200', async () => {
    mockFetch({ ok: false, status: 400, body: '{"error":{"reason":"bad PPL"}}' });
    await expect(ppl({ query: 'broken' }, { datasourceUrl: 'http://localhost:9200' })).rejects.toMatchObject({
      name: 'OpenSearchPPLError',
      status: 400,
      body: '{"error":{"reason":"bad PPL"}}',
    });
    await expect(ppl({ query: 'broken' }, { datasourceUrl: 'http://localhost:9200' })).rejects.toBeInstanceOf(
      OpenSearchPPLError
    );
  });

  it('builds a URL relative to window.location.origin when datasourceUrl is a path', async () => {
    const mock = mockFetch({ ok: true, status: 200, body: { schema: [], datarows: [] } });
    await ppl({ query: 'q' }, { datasourceUrl: '/api/datasources/proxy/1/' });
    const [url] = mock.mock.calls[0] as [string];
    expect(url).toContain('/api/datasources/proxy/1/_plugins/_ppl');
  });

  describe('OpenSearchPPLError.message', () => {
    it('uses error.reason from a JSON body when present', () => {
      const err = new OpenSearchPPLError(400, '{"error":{"reason":"bad PPL","type":"SyntaxCheckException"}}');
      expect(err.message).toBe('OpenSearch PPL request failed (400): bad PPL');
      expect(err.body).toBe('{"error":{"reason":"bad PPL","type":"SyntaxCheckException"}}');
    });

    it('falls back to error.details when reason is absent', () => {
      const err = new OpenSearchPPLError(400, '{"error":{"details":"timestamp:2026-... in unsupported format"}}');
      expect(err.message).toBe('OpenSearch PPL request failed (400): timestamp:2026-... in unsupported format');
    });

    it('omits the body entirely when the body is not JSON', () => {
      const err = new OpenSearchPPLError(502, '<html>Bad Gateway</html>');
      expect(err.message).toBe('OpenSearch PPL request failed (502)');
      expect(err.body).toBe('<html>Bad Gateway</html>');
    });

    it('omits the body when JSON has no error field', () => {
      const err = new OpenSearchPPLError(500, '{"status":"weird"}');
      expect(err.message).toBe('OpenSearch PPL request failed (500)');
    });
  });
});
