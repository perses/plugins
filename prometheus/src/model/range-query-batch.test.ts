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

import { afterEach, describe, expect, it, vi } from 'vitest';
import { rangeQueryBatch } from './prometheus-client';

const baseOpts = {
  datasourceUrl: 'http://prom.test',
  headers: {},
};

describe('rangeQueryBatch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns empty results for zero queries without fetch', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const res = await rangeQueryBatch(
      { start: 1, end: 2, step: 15, queries: [] },
      baseOpts,
    );
    expect(res).toEqual({ status: 'success', data: { results: {} } });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('uses single rangeQuery path for one query', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          data: { resultType: 'matrix', result: [] },
        }),
      }),
    );
    const res = await rangeQueryBatch(
      {
        start: 1,
        end: 2,
        step: 15,
        queries: [{ id: 'a', query: 'up' }],
      },
      baseOpts,
    );
    expect(res.status).toBe('success');
    expect(res.data.results['a']?.status).toBe('success');
    expect(fetch).toHaveBeenCalledTimes(1);
    const url = String((fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] ?? '');
    expect(url).toContain('/api/v1/query_range');
    expect(url).not.toContain('query_range_batch');
  });

  it('posts to query_range_batch when endpoint succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 'success',
          data: {
            results: {
              '0': { status: 'success', data: { resultType: 'matrix', result: [] } },
              '1': { status: 'success', data: { resultType: 'matrix', result: [] } },
            },
          },
        }),
      }),
    );
    const res = await rangeQueryBatch(
      {
        start: 10,
        end: 20,
        step: 5,
        queries: [
          { id: '0', query: 'up' },
          { id: '1', query: 'node_cpu' },
        ],
      },
      baseOpts,
    );
    expect(res.status).toBe('success');
    expect(Object.keys(res.data.results)).toEqual(['0', '1']);
    expect(fetch).toHaveBeenCalledTimes(1);
    const url = String((fetch as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] ?? '');
    expect(url).toContain('/api/v1/query_range_batch');
  });

  it('falls back to parallel rangeQuery when batch endpoint fails', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('404 batch missing'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: { resultType: 'matrix', result: [] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: { resultType: 'matrix', result: [] } }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const res = await rangeQueryBatch(
      {
        start: 1,
        end: 2,
        step: 1,
        queries: [
          { id: 'a', query: 'up' },
          { id: 'b', query: 'up' },
        ],
      },
      baseOpts,
    );
    expect(res.status).toBe('success');
    expect(res.data.results['a']?.status).toBe('success');
    expect(res.data.results['b']?.status).toBe('success');
    // 1 failed batch + 2 rangeQuery
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('records fan-out errors per query id', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('no batch'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success', data: { resultType: 'matrix', result: [] } }),
      })
      .mockRejectedValueOnce(new Error('upstream boom'));
    vi.stubGlobal('fetch', fetchMock);

    const res = await rangeQueryBatch(
      {
        start: 1,
        end: 2,
        step: 1,
        queries: [
          { id: 'ok', query: 'up' },
          { id: 'ko', query: 'bad' },
        ],
      },
      baseOpts,
    );
    expect(res.data.results['ok']?.status).toBe('success');
    expect(res.data.results['ko']?.status).toBe('error');
    expect(res.data.results['ko'] && 'error' in res.data.results['ko'] ? res.data.results['ko'].error : '').toContain(
      'upstream boom',
    );
  });
});
