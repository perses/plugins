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

import { getTrace, searchOperations, searchServices, searchTraces } from './jaeger-client';

const fetchMock = (global.fetch = jest.fn());

describe('jaeger-client', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('formats trace search params and preserves repeated trace ids', async () => {
    fetchMock.mockResolvedValueOnce({ json: () => Promise.resolve({ data: [] }) });

    await searchTraces(
      {
        traceID: ['abc', 'def'],
        service: 'frontend',
        tags: '{"http.status_code":"500"}',
        limit: 25,
        start: 1000,
      },
      { datasourceUrl: 'http://jaeger.example' }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'http://jaeger.example/api/traces?traceID=abc&traceID=def&service=frontend&tags=%7B%22http.status_code%22%3A%22500%22%7D&limit=25&start=1000',
      {
        headers: {},
        method: 'GET',
      }
    );
  });

  it('formats trace lookup url', async () => {
    fetchMock.mockResolvedValueOnce({ json: () => Promise.resolve({ data: [] }) });

    await getTrace('abc/def', { datasourceUrl: 'http://jaeger.example' });

    expect(fetchMock).toHaveBeenCalledWith('http://jaeger.example/api/traces/abc%2Fdef', {
      headers: {},
      method: 'GET',
    });
  });

  it('formats services and operations urls', async () => {
    fetchMock.mockResolvedValueOnce({ json: () => Promise.resolve({ data: [] }) });
    fetchMock.mockResolvedValueOnce({ json: () => Promise.resolve({ data: [] }) });

    await searchServices({ datasourceUrl: '' });
    await searchOperations('checkout/frontend', { datasourceUrl: '' });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/services', {
      headers: {},
      method: 'GET',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/operations?service=checkout%2Ffrontend', {
      headers: {},
      method: 'GET',
    });
  });
});
