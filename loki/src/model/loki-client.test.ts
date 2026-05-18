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

import { AbsoluteTimeRange } from '@perses-dev/core';
import { toUnixSeconds, getLokiTimeRange, labels, labelValues } from './loki-client';

// Mock global fetch for labels/labelValues tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ status: 'success', data: [] }),
  });
});

describe('toUnixSeconds', () => {
  it('converts a Date to unix seconds string', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    expect(toUnixSeconds(date)).toBe(Math.floor(date.getTime() / 1000).toString());
  });

  it('converts a millisecond timestamp number to unix seconds string', () => {
    // 1705320000000 ms = 1705320000 s
    expect(toUnixSeconds(1705320000000)).toBe('1705320000');
  });

  it('passes through a seconds-range number as string', () => {
    expect(toUnixSeconds(1705320000)).toBe('1705320000');
  });

  it('converts a numeric string in milliseconds to unix seconds', () => {
    expect(toUnixSeconds('1705320000000')).toBe('1705320000');
  });

  it('converts an ISO date string to unix seconds', () => {
    const isoString = '2024-01-15T12:00:00Z';
    const expected = Math.floor(new Date(isoString).getTime() / 1000).toString();
    expect(toUnixSeconds(isoString)).toBe(expected);
  });
});

describe('getLokiTimeRange', () => {
  it('converts an AbsoluteTimeRange to start/end unix seconds strings', () => {
    const timeRange: AbsoluteTimeRange = {
      start: new Date('2024-01-15T10:00:00Z'),
      end: new Date('2024-01-15T11:00:00Z'),
    };
    const result = getLokiTimeRange(timeRange);
    expect(result).toEqual({
      start: Math.floor(new Date('2024-01-15T10:00:00Z').getTime() / 1000).toString(),
      end: Math.floor(new Date('2024-01-15T11:00:00Z').getTime() / 1000).toString(),
    });
  });

  it('handles epoch boundaries', () => {
    const timeRange: AbsoluteTimeRange = {
      start: new Date('1970-01-01T00:00:00Z'),
      end: new Date('1970-01-01T00:01:00Z'),
    };
    const result = getLokiTimeRange(timeRange);
    expect(result).toEqual({ start: '0', end: '60' });
  });
});

describe('labels', () => {
  const options = { datasourceUrl: 'http://localhost:3100' };

  it('appends query parameter to URL when provided', async () => {
    await labels({ start: '1000', end: '2000', query: '{job="varlogs"}' }, options);

    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.searchParams.get('start')).toBe('1000');
    expect(calledUrl.searchParams.get('end')).toBe('2000');
    expect(calledUrl.searchParams.get('query')).toBe('{job="varlogs"}');
  });

  it('omits query parameter when undefined', async () => {
    await labels({ start: '1000', end: '2000' }, options);

    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.searchParams.get('start')).toBe('1000');
    expect(calledUrl.searchParams.get('end')).toBe('2000');
    expect(calledUrl.searchParams.has('query')).toBe(false);
  });

  it('works with no optional parameters', async () => {
    await labels({}, options);

    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.searchParams.has('start')).toBe(false);
    expect(calledUrl.searchParams.has('end')).toBe(false);
    expect(calledUrl.searchParams.has('query')).toBe(false);
  });
});

describe('labelValues', () => {
  const options = { datasourceUrl: 'http://localhost:3100' };

  it('appends query parameter to URL when provided', async () => {
    await labelValues({ labelName: 'job', start: '1000', end: '2000', query: '{namespace="prod"}' }, options);

    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.pathname).toBe('/loki/api/v1/label/job/values');
    expect(calledUrl.searchParams.get('start')).toBe('1000');
    expect(calledUrl.searchParams.get('end')).toBe('2000');
    expect(calledUrl.searchParams.get('query')).toBe('{namespace="prod"}');
  });

  it('omits query parameter when undefined', async () => {
    await labelValues({ labelName: 'job', start: '1000', end: '2000' }, options);

    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.searchParams.get('start')).toBe('1000');
    expect(calledUrl.searchParams.get('end')).toBe('2000');
    expect(calledUrl.searchParams.has('query')).toBe(false);
  });

  it('works with no optional parameters', async () => {
    await labelValues({ labelName: 'job' }, options);

    const calledUrl = new URL(mockFetch.mock.calls[0][0]);
    expect(calledUrl.pathname).toBe('/loki/api/v1/label/job/values');
    expect(calledUrl.searchParams.has('start')).toBe(false);
    expect(calledUrl.searchParams.has('end')).toBe(false);
    expect(calledUrl.searchParams.has('query')).toBe(false);
  });
});

describe('handleErrorResponse', () => {
  const options = { datasourceUrl: 'http://localhost:3100' };

  it('throws with JSON body when content-type is application/json', async () => {
    const errorBody = { message: 'parse error', status: 'error' };
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(errorBody),
    });

    await expect(labels({}, options)).rejects.toThrow(
      'Loki query_range error: 400 Bad Request - {"message":"parse error","status":"error"}'
    );
  });

  it('throws with text body when content-type is not JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: () => Promise.resolve('upstream timeout'),
    });

    await expect(labels({}, options)).rejects.toThrow(
      'Loki query_range error: 500 Internal Server Error - upstream timeout'
    );
  });

  it('throws with text body when headers are missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      headers: undefined,
      text: () => Promise.resolve('no healthy upstream'),
    });

    await expect(labels({}, options)).rejects.toThrow('Loki query_range error: 502 Bad Gateway - no healthy upstream');
  });

  it('throws with text body when content-type header is absent', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers(),
      text: () => Promise.resolve('service down'),
    });

    await expect(labels({}, options)).rejects.toThrow('Loki query_range error: 503 Service Unavailable - service down');
  });
});
