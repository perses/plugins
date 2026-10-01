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

import type { Mock } from 'vitest';

import { ppl, sql, search, OpenSearchApiError } from './opensearch-client';

describe('opensearch-client', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.resetAllMocks();
  });

  function mockFetch(response: { ok: boolean; status: number; body: unknown }): Mock {
    const mock = vi.fn(async () => ({
      ok: response.ok,
      status: response.status,
      text: async (): Promise<string> =>
        typeof response.body === 'string' ? response.body : JSON.stringify(response.body),
      json: async (): Promise<unknown> => response.body,
    })) as unknown as Mock;
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
      { datasourceUrl: 'http://localhost:9200', headers: { Authorization: 'Basic xyz' } },
    );
    const [, init] = mock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Basic xyz');
  });

  it('throws OpenSearchApiError carrying status and body on non-200', async () => {
    mockFetch({ ok: false, status: 400, body: '{"error":{"reason":"bad PPL"}}' });
    await expect(ppl({ query: 'broken' }, { datasourceUrl: 'http://localhost:9200' })).rejects.toMatchObject({
      name: 'OpenSearchApiError',
      status: 400,
      body: '{"error":{"reason":"bad PPL"}}',
    });
    await expect(ppl({ query: 'broken' }, { datasourceUrl: 'http://localhost:9200' })).rejects.toBeInstanceOf(
      OpenSearchApiError,
    );
  });

  it('labels the error message PPL', async () => {
    mockFetch({ ok: false, status: 400, body: '{"error":{"reason":"bad PPL"}}' });
    await expect(ppl({ query: 'broken' }, { datasourceUrl: 'http://localhost:9200' })).rejects.toThrow(
      'OpenSearch PPL request failed (400): bad PPL',
    );
  });

  it('builds a URL relative to window.location.origin when datasourceUrl is a path', async () => {
    const mock = mockFetch({ ok: true, status: 200, body: { schema: [], datarows: [] } });
    await ppl({ query: 'q' }, { datasourceUrl: '/api/datasources/proxy/1/' });
    const [url] = mock.mock.calls[0] as [string];
    expect(url).toContain('/api/datasources/proxy/1/_plugins/_ppl');
  });

  describe('OpenSearchApiError.message', () => {
    it('uses error.reason from a JSON body when present', () => {
      const err = new OpenSearchApiError(400, '{"error":{"reason":"bad PPL","type":"SyntaxCheckException"}}');
      expect(err.message).toBe('OpenSearch API request failed (400): bad PPL');
      expect(err.body).toBe('{"error":{"reason":"bad PPL","type":"SyntaxCheckException"}}');
    });

    it('falls back to error.details when reason is absent', () => {
      const err = new OpenSearchApiError(400, '{"error":{"details":"timestamp:2026-... in unsupported format"}}');
      expect(err.message).toBe('OpenSearch API request failed (400): timestamp:2026-... in unsupported format');
    });

    it('omits the body entirely when the body is not JSON', () => {
      const err = new OpenSearchApiError(502, '<html>Bad Gateway</html>');
      expect(err.message).toBe('OpenSearch API request failed (502)');
      expect(err.body).toBe('<html>Bad Gateway</html>');
    });

    it('omits the body when JSON has no error field', () => {
      const err = new OpenSearchApiError(500, '{"status":"weird"}');
      expect(err.message).toBe('OpenSearch API request failed (500)');
    });

    it('combines reason and details when both are present and differ', () => {
      const err = new OpenSearchApiError(
        400,
        '{"error":{"reason":"Invalid Query","details":"can\'t resolve Symbol(name=@timestamp)"}}',
      );
      expect(err.message).toBe(
        "OpenSearch API request failed (400): Invalid Query — can't resolve Symbol(name=@timestamp)",
      );
    });

    it('does not duplicate text when reason equals details', () => {
      const err = new OpenSearchApiError(400, '{"error":{"reason":"same text","details":"same text"}}');
      expect(err.message).toBe('OpenSearch API request failed (400): same text');
    });

    it('uses reason alone when details is an empty string', () => {
      const err = new OpenSearchApiError(400, '{"error":{"reason":"Invalid Query","details":""}}');
      expect(err.message).toBe('OpenSearch API request failed (400): Invalid Query');
    });

    it('explains a Perses proxy 403 for an endpoint missing from allowedEndpoints', () => {
      const err = new OpenSearchApiError(
        403,
        '{"message":"you are not allowed to use this endpoint \\"/_plugins/_sql\\" with the HTTP method POST"}',
      );
      expect(err.message).toBe(
        'OpenSearch API request was blocked by the Perses datasource proxy (403): ' +
          'you are not allowed to use this endpoint "/_plugins/_sql" with the HTTP method POST. ' +
          "Add the endpoint to the datasource's proxy allowedEndpoints (POST /_plugins/_ppl, " +
          '/_plugins/_sql and /.*/_search).',
      );
    });

    it('keeps the OpenSearch reason for a 403 that did not come from the proxy', () => {
      const err = new OpenSearchApiError(403, '{"error":{"reason":"no permissions for [indices:data/read/search]"}}');
      expect(err.message).toBe('OpenSearch API request failed (403): no permissions for [indices:data/read/search]');
    });

    it('falls through to details when reason is an empty string', () => {
      const err = new OpenSearchApiError(
        400,
        '{"error":{"reason":"","details":"can\'t resolve Symbol(name=@timestamp)"}}',
      );
      expect(err.message).toBe("OpenSearch API request failed (400): can't resolve Symbol(name=@timestamp)");
    });
  });

  describe('sql', () => {
    it('POSTs to /_plugins/_sql with query and filter', async () => {
      const mock = mockFetch({ ok: true, status: 200, body: { schema: [], datarows: [] } });
      const filter = { range: { '@timestamp': { gte: 1, lte: 2, format: 'epoch_millis' } } };
      await sql({ query: 'SELECT * FROM logs', filter }, { datasourceUrl: 'http://localhost:9200' });

      const [url, init] = mock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('http://localhost:9200/_plugins/_sql');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string)).toEqual({ query: 'SELECT * FROM logs', filter });
    });

    it('omits filter from the body when not provided', async () => {
      const mock = mockFetch({ ok: true, status: 200, body: { schema: [], datarows: [] } });
      await sql({ query: 'SELECT 1' }, { datasourceUrl: 'http://localhost:9200' });
      const [, init] = mock.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(init.body as string)).toEqual({ query: 'SELECT 1' });
    });

    it('labels the error message SQL', async () => {
      mockFetch({ ok: false, status: 400, body: '{"error":{"reason":"bad SQL"}}' });
      await expect(sql({ query: 'x' }, { datasourceUrl: 'http://localhost:9200' })).rejects.toThrow(
        'OpenSearch SQL request failed (400): bad SQL',
      );
    });
  });

  describe('search', () => {
    it('POSTs the body to /{index}/_search', async () => {
      const mock = mockFetch({ ok: true, status: 200, body: { hits: { hits: [] } } });
      const body = { size: 500, query: { match_all: {} } };
      await search({ index: 'logs-*', body }, { datasourceUrl: 'http://localhost:9200' });

      const [url, init] = mock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('http://localhost:9200/logs-*/_search');
      expect(JSON.parse(init.body as string)).toEqual(body);
    });

    it('preserves commas for multi-index patterns', async () => {
      const mock = mockFetch({ ok: true, status: 200, body: { hits: { hits: [] } } });
      await search({ index: 'a-*,b-*', body: {} }, { datasourceUrl: 'http://localhost:9200' });
      const [url] = mock.mock.calls[0] as [string];
      expect(url).toBe('http://localhost:9200/a-*,b-*/_search');
    });

    it('allows dots within an index name (date-suffixed indices)', async () => {
      const mock = mockFetch({ ok: true, status: 200, body: { hits: { hits: [] } } });
      await search({ index: 'logs-2025.01.01', body: {} }, { datasourceUrl: 'http://localhost:9200' });
      const [url] = mock.mock.calls[0] as [string];
      expect(url).toBe('http://localhost:9200/logs-2025.01.01/_search');
    });

    it.each([
      '../_cluster/settings',
      'logs/../..',
      'a?b',
      'a#b',
      'logs *',
      '',
      '%2e%2e',
      '%2E%2E',
      '%2e',
      '.',
      '..',
      '\\',
      'logs-*,.',
      'a%20b',
    ])('rejects unsafe index %p without issuing a request', async (index) => {
      const mock = mockFetch({ ok: true, status: 200, body: { hits: { hits: [] } } });
      await expect(search({ index, body: {} }, { datasourceUrl: 'http://localhost:9200' })).rejects.toThrow(
        /invalid OpenSearch index/i,
      );
      expect(mock).not.toHaveBeenCalled();
    });

    it('surfaces root_cause reason from a _search error body', async () => {
      mockFetch({
        ok: false,
        status: 400,
        body: '{"error":{"type":"search_phase_execution_exception","root_cause":[{"reason":"failed to parse date field"}]},"status":400}',
      });
      await expect(search({ index: 'logs-*', body: {} }, { datasourceUrl: 'http://localhost:9200' })).rejects.toThrow(
        'OpenSearch Search request failed (400): failed to parse date field',
      );
    });
  });
});
