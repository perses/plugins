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

import { JaegerRequestError, getTrace, searchOperations, searchServices, searchTraces } from './jaeger-client';

const fetchMock = (global.fetch = vi.fn());

function jsonResponse(body: unknown): Pick<Response, 'ok' | 'status' | 'json'> {
  return { ok: true, status: 200, json: (): Promise<unknown> => Promise.resolve(body) };
}

function errorResponse(status: number, body: string): Pick<Response, 'ok' | 'status' | 'text'> {
  return { ok: false, status, text: (): Promise<string> => Promise.resolve(body) };
}

describe('jaeger-client', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  describe('searchTraces', () => {
    const searchWindow = {
      startTime: new Date('2024-06-11T10:00:00.000Z'),
      endTime: new Date('2024-06-11T11:00:00.000Z'),
    };

    it('uses the API v3 endpoint and formats the search parameters', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ result: { resourceSpans: [] } }));

      await searchTraces(
        {
          service: 'frontend',
          operation: 'GET /cart',
          minDuration: '100ms',
          maxDuration: '2s',
          limit: 25,
          ...searchWindow,
        },
        { datasourceUrl: 'http://jaeger.example' },
      );

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      const parsed = new URL(url);
      expect(`${parsed.origin}${parsed.pathname}`).toBe('http://jaeger.example/api/v3/traces');
      expect(init).toEqual({ headers: {}, method: 'GET' });
      expect(Array.from(parsed.searchParams.entries())).toEqual([
        ['query.serviceName', 'frontend'],
        ['query.service_name', 'frontend'],
        ['query.operationName', 'GET /cart'],
        ['query.operation_name', 'GET /cart'],
        ['query.startTimeMin', '2024-06-11T10:00:00.000Z'],
        ['query.start_time_min', '2024-06-11T10:00:00.000Z'],
        ['query.startTimeMax', '2024-06-11T11:00:00.000Z'],
        ['query.start_time_max', '2024-06-11T11:00:00.000Z'],
        ['query.durationMin', '100ms'],
        ['query.duration_min', '100ms'],
        ['query.durationMax', '2s'],
        ['query.duration_max', '2s'],
        ['query.searchDepth', '25'],
        ['query.search_depth', '25'],
        ['query.num_traces', '25'],
      ]);
    });

    it('sends tags and span kind as string attribute filters', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ result: { resourceSpans: [] } }));

      await searchTraces(
        {
          service: 'frontend',
          tags: '{"http.status_code":500,"error":true,"env":"prod"}',
          spanKind: 'server',
          ...searchWindow,
        },
        { datasourceUrl: '' },
      );

      const parsed = new URL(fetchMock.mock.calls[0]?.[0], 'http://localhost');
      expect(JSON.parse(parsed.searchParams.get('query.attributes') ?? '')).toEqual({
        'http.status_code': '500',
        error: 'true',
        env: 'prod',
        'span.kind': 'server',
      });
    });

    it('returns the traces data of the response', async () => {
      const result = { resourceSpans: [{ scopeSpans: [{ spans: [] }] }] };
      fetchMock.mockResolvedValueOnce(jsonResponse({ result }));

      await expect(searchTraces({ service: 'frontend', ...searchWindow }, { datasourceUrl: '' })).resolves.toEqual(
        result,
      );
    });

    it('treats a search without any match as an empty result', async () => {
      fetchMock.mockResolvedValueOnce(errorResponse(404, '{"error":{"httpCode":404,"message":"No traces found"}}'));

      await expect(searchTraces({ service: 'frontend', ...searchWindow }, { datasourceUrl: '' })).resolves.toEqual({});
    });

    it('does not hide other failures as an empty result', async () => {
      fetchMock.mockResolvedValueOnce(errorResponse(404, '404 page not found'));
      fetchMock.mockResolvedValueOnce(
        errorResponse(400, '{"error":{"httpCode":400,"message":"invalid query: search depth too large"}}'),
      );

      await expect(searchTraces({ service: 'frontend', ...searchWindow }, { datasourceUrl: '' })).rejects.toMatchObject(
        { name: 'JaegerRequestError', status: 404, message: 'Jaeger request failed with status 404' },
      );
      await expect(searchTraces({ service: 'frontend', ...searchWindow }, { datasourceUrl: '' })).rejects.toThrow(
        'invalid query: search depth too large',
      );
    });
  });

  describe('getTrace', () => {
    it('formats the trace lookup url and returns the traces data', async () => {
      const result = { resourceSpans: [] };
      fetchMock.mockResolvedValueOnce(jsonResponse({ result }));

      await expect(getTrace('abc/def', { datasourceUrl: 'http://jaeger.example' })).resolves.toEqual(result);

      expect(fetchMock).toHaveBeenCalledWith('http://jaeger.example/api/v3/traces/abc%2Fdef', {
        headers: {},
        method: 'GET',
      });
    });

    it('rejects with the status of a failed lookup', async () => {
      fetchMock.mockResolvedValueOnce(errorResponse(404, '{"error":{"httpCode":404,"message":"No traces found"}}'));

      const error = await getTrace('abc', { datasourceUrl: '' }).catch((e) => e);

      expect(error).toBeInstanceOf(JaegerRequestError);
      expect(error.status).toBe(404);
      expect(error.message).toBe('No traces found');
    });

    it('passes the headers and the custom fetch to the request', async () => {
      const customFetch = vi.fn().mockResolvedValueOnce(jsonResponse({ result: {} }));

      await getTrace('abc', { datasourceUrl: '', headers: { Authorization: 'Bearer token' }, fetch: customFetch });

      expect(customFetch).toHaveBeenCalledWith('/api/v3/traces/abc', {
        headers: { Authorization: 'Bearer token' },
        method: 'GET',
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it('formats services and operations urls and unwraps their responses', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ services: ['frontend', 'cart'] }));
    fetchMock.mockResolvedValueOnce(jsonResponse({ operations: [{ name: 'GET /cart', spanKind: 'server' }] }));

    await expect(searchServices({ datasourceUrl: '' })).resolves.toEqual({ data: ['frontend', 'cart'] });
    await expect(searchOperations('checkout/frontend', { datasourceUrl: '' })).resolves.toEqual({
      data: [{ name: 'GET /cart', spanKind: 'server' }],
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v3/services', {
      headers: {},
      method: 'GET',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v3/operations?service=checkout%2Ffrontend', {
      headers: {},
      method: 'GET',
    });
  });

  it('returns empty lists when Jaeger has no services or operations', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}));
    fetchMock.mockResolvedValueOnce(jsonResponse({}));

    await expect(searchServices({ datasourceUrl: '' })).resolves.toEqual({ data: [] });
    await expect(searchOperations('frontend', { datasourceUrl: '' })).resolves.toEqual({ data: [] });
  });
});
