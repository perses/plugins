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

import { UserFriendlyError } from '@perses-dev/client';
import { MOCK_TRACE_RESPONSE } from '../test';
import { query, search, searchTagValues } from './tempo-client';

const fetchMock = (global.fetch = jest.fn());

function mockErrorResponse(status: number, statusText: string, overrides?: Record<string, unknown>): unknown {
  const resp = {
    ok: false,
    status,
    statusText,
    headers: new Headers(),
    clone: (): unknown => resp,
    text: (): Promise<string> => Promise.resolve(statusText),
    ...overrides,
  };
  return resp;
}

describe('tempo-client', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('should return v2 query response', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(MOCK_TRACE_RESPONSE) });

    const result = await query({ traceId: 'abc123' }, { datasourceUrl: '' });
    expect(result).toEqual(MOCK_TRACE_RESPONSE);
  });

  it('should throw 404 when trace has no resourceSpans', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ trace: {} }),
    });

    await expect(query({ traceId: 'nonexistent' }, { datasourceUrl: '' })).rejects.toThrow(
      new UserFriendlyError('Trace not found', 404)
    );
  });

  it('formats the search params and ignores undefined values', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    await searchTagValues({ tag: 'name', q: '{}', start: 10, end: undefined }, { datasourceUrl: '' });
    expect(fetchMock).toHaveBeenCalledWith('/api/v2/search/tag/name/values?q=%7B%7D&start=10', {
      headers: { Accept: 'application/json' },
      method: 'GET',
    });
  });

  it('should throw a short error when response is HTML instead of JSON', async () => {
    fetchMock.mockResolvedValueOnce(
      mockErrorResponse(502, '<html><body>Bad Gateway</body></html>', {
        headers: new Headers({ 'content-type': 'text/html' }),
      })
    );

    await expect(search({ q: '{}' }, { datasourceUrl: '' })).rejects.toThrow('Invalid response from server');
  });
});
