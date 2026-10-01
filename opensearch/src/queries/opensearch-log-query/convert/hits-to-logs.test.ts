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

import { convertHitsToLogs, flattenSource } from './hits-to-logs';

describe('flattenSource', () => {
  it('flattens nested objects to dot paths and stringifies scalars', () => {
    expect(flattenSource({ a: { b: 1, c: 'x' }, d: true })).toEqual({ 'a.b': '1', 'a.c': 'x', d: 'true' });
  });

  it('JSON-stringifies arrays rather than exploding them', () => {
    expect(flattenSource({ tags: ['a', 'b'] })).toEqual({ tags: '["a","b"]' });
  });

  it('drops null and undefined values', () => {
    expect(flattenSource({ a: null, b: undefined, c: 0 })).toEqual({ c: '0' });
  });
});

describe('convertHitsToLogs', () => {
  const response = {
    hits: {
      total: { value: 2, relation: 'eq' as const },
      hits: [
        {
          _index: 'logs-2025.01.01',
          _id: 'abc',
          _source: {
            '@timestamp': '2025-01-01T00:00:00.000Z',
            message: 'Error processing request',
            level: 'error',
            service: { name: 'api' },
          },
        },
        {
          _index: 'logs-2025.01.01',
          _id: 'def',
          _source: { '@timestamp': '2025-01-01T00:00:01.000Z', message: 'Retrying', level: 'warn' },
        },
      ],
    },
  };

  it('maps _source to timestamp, line, and labels', () => {
    const { entries } = convertHitsToLogs(response);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      timestamp: 1735689600,
      line: 'Error processing request',
      labels: { level: 'error', 'service.name': 'api', _id: 'abc', _index: 'logs-2025.01.01' },
    });
  });

  it('excludes the chosen timestamp and message fields from labels', () => {
    const { entries } = convertHitsToLogs(response);
    expect(entries[0]?.labels['@timestamp']).toBeUndefined();
    expect(entries[0]?.labels.message).toBeUndefined();
  });

  it('reports totalCount from hits.total and no hasMore when the count is exact', () => {
    const result = convertHitsToLogs(response);
    expect(result.totalCount).toBe(2);
    expect(result.hasMore).toBeUndefined();
  });

  it('sets hasMore when hits.total.relation is gte', () => {
    const result = convertHitsToLogs({
      hits: { total: { value: 10000, relation: 'gte' }, hits: [] },
    });
    expect(result.totalCount).toBe(10000);
    expect(result.hasMore).toBe(true);
  });

  it('sets hasMore when an exact total exceeds the hits returned', () => {
    const result = convertHitsToLogs({
      hits: { total: { value: 5000, relation: 'eq' }, hits: [{ _source: { message: 'a' } }] },
    });
    expect(result.totalCount).toBe(5000);
    expect(result.hasMore).toBe(true);
  });

  it('parses a fractional epoch-seconds timestamp', () => {
    const { entries } = convertHitsToLogs({
      hits: { hits: [{ _source: { '@timestamp': 1735689600.5, message: 'a' } }] },
    });
    expect(entries[0]?.timestamp).toBe(1735689600.5);
  });

  it('falls back to the entry count when hits.total is absent', () => {
    const result = convertHitsToLogs({ hits: { hits: [{ _source: { message: 'a' } }] } });
    expect(result.totalCount).toBe(1);
  });

  it('honours explicit timestampField and messageField overrides', () => {
    const { entries } = convertHitsToLogs(
      { hits: { hits: [{ _source: { ts: 1735689600000, body: 'hello', other: 'x' } }] } },
      { timestampField: 'ts', messageField: 'body' },
    );
    expect(entries[0]?.timestamp).toBe(1735689600);
    expect(entries[0]?.line).toBe('hello');
    expect(entries[0]?.labels).toEqual({ other: 'x' });
  });

  it('falls back through the default field names', () => {
    const { entries } = convertHitsToLogs({
      hits: { hits: [{ _source: { time: '2025-01-01T00:00:00.000Z', body: 'from body' } }] },
    });
    expect(entries[0]?.timestamp).toBe(1735689600);
    expect(entries[0]?.line).toBe('from body');
  });

  it('stringifies the whole source when no message field matches', () => {
    const { entries } = convertHitsToLogs({ hits: { hits: [{ _source: { foo: 'bar' } }] } });
    expect(entries[0]?.line).toBe(JSON.stringify({ foo: 'bar' }));
  });

  it('yields timestamp 0 and an empty-object line for a hit with no _source', () => {
    const { entries } = convertHitsToLogs({ hits: { hits: [{ _id: 'x' }] } });
    expect(entries[0]?.timestamp).toBe(0);
    expect(entries[0]?.line).toBe('{}');
    expect(entries[0]?.labels).toEqual({ _id: 'x' });
  });

  it('returns no entries for an empty hits array', () => {
    expect(convertHitsToLogs({ hits: { hits: [] } })).toEqual({ entries: [], totalCount: 0 });
  });
});
