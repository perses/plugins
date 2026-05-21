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

import { fetch } from '@perses-dev/core';
import { greptimedbQuery } from './greptimedb-client';

jest.mock('@perses-dev/core', () => {
  const actual = jest.requireActual<typeof import('@perses-dev/core')>('@perses-dev/core');
  return {
    ...actual,
    fetch: jest.fn(),
  };
});

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

const queryOptions = { datasourceUrl: 'http://greptimedb.test' };

/** POST /v1/sql error body from GreptimeDB HTTP API (empty sql). */
const GREPTIMEDB_SQL_ERROR_JSON = {
  code: 1004,
  error: 'Invalid SQL, error: empty statements',
  execution_time_ms: 0,
} as const;

describe('readErrorResponse (via greptimedbQuery)', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('formats GreptimeDB JSON errors (application/json)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(GREPTIMEDB_SQL_ERROR_JSON),
    } as Response);

    const result = await greptimedbQuery({ query: 'SELECT 1' }, queryOptions);

    expect(result.status).toBe('error');
    expect(result.error).toBe(`GreptimeDB error: 400 Bad Request - ${JSON.stringify(GREPTIMEDB_SQL_ERROR_JSON)}`);
  });

  it('formats non-JSON errors via response.text()', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: () => Promise.resolve('bad gateway'),
    } as Response);

    const result = await greptimedbQuery({ query: 'SELECT 1' }, queryOptions);

    expect(result.status).toBe('error');
    expect(result.error).toBe('GreptimeDB error: 502 Bad Gateway - bad gateway');
  });
});
