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

import { buildDslSearchBody } from './dsl';

const start = new Date('2025-01-01T00:00:00.000Z'); // 1735689600000
const end = new Date('2025-01-01T01:00:00.000Z'); //   1735693200000

const timeFilter = {
  range: { '@timestamp': { gte: 1735689600000, lte: 1735693200000, format: 'epoch_millis' } },
};

describe('buildDslSearchBody', () => {
  it("ANDs the user's query under bool.must with the time range in bool.filter", () => {
    const body = buildDslSearchBody('{"query":{"match":{"level":"error"}}}', start, end);
    expect(body).toEqual({
      size: 500,
      sort: [{ '@timestamp': { order: 'desc', unmapped_type: 'date' } }],
      query: { bool: { must: [{ match: { level: 'error' } }], filter: [timeFilter] } },
    });
  });

  it('applies only the time filter when the body has no query key', () => {
    const body = buildDslSearchBody('{}', start, end);
    expect(body.query).toEqual({ bool: { filter: [timeFilter] } });
  });

  it("lets the user's own sort win", () => {
    const body = buildDslSearchBody('{"sort":[{"seq":"asc"}],"query":{"match_all":{}}}', start, end);
    expect(body.sort).toEqual([{ seq: 'asc' }]);
  });

  it.each([
    ['a smaller body size under the limit', '{"size":7}', 500, 7],
    ['the limit over a larger body size', '{"size":1000}', 10, 10],
    ['the body size when no limit is set', '{"size":1000}', undefined, 1000],
    ['the limit when the body has no size', '{}', 10, 10],
    ['the limit over a non-numeric body size', '{"size":"1000"}', 10, 10],
    ['10,000 over a hand-edited limit above it', '{"size":50000}', 20000, 10000],
    ['10,000 over a body size above it when no limit is set', '{"size":50000}', undefined, 10000],
  ])('caps size: keeps %s', (_, json, limit, expected) => {
    expect(buildDslSearchBody(json, start, end, { limit }).size).toBe(expected);
  });

  it('passes unrelated top-level keys through untouched', () => {
    const body = buildDslSearchBody(
      '{"_source":["message"],"aggs":{"by_level":{"terms":{"field":"level"}}}}',
      start,
      end,
    );
    expect(body['_source']).toEqual(['message']);
    expect(body.aggs).toEqual({ by_level: { terms: { field: 'level' } } });
  });

  it('nests a user bool query inside our must rather than merging it', () => {
    const body = buildDslSearchBody('{"query":{"bool":{"must_not":[{"term":{"level":"debug"}}]}}}', start, end);
    expect(body.query).toEqual({
      bool: { must: [{ bool: { must_not: [{ term: { level: 'debug' } }] } }], filter: [timeFilter] },
    });
  });

  it('keeps the query untouched when disableTimeFilter is set', () => {
    const body = buildDslSearchBody('{"query":{"match_all":{}}}', start, end, { disableTimeFilter: true });
    expect(body.query).toEqual({ match_all: {} });
  });

  it('defaults to match_all when there is neither a query nor a time filter', () => {
    const body = buildDslSearchBody('{}', start, end, { disableTimeFilter: true });
    expect(body.query).toEqual({ match_all: {} });
  });

  it('preserves an explicit size of 0 rather than falling back to the default', () => {
    expect(buildDslSearchBody('{"size":0,"query":{"match_all":{}}}', start, end).size).toBe(0);
  });

  it('preserves an explicit empty sort array rather than falling back to the default', () => {
    expect(buildDslSearchBody('{"sort":[],"query":{"match_all":{}}}', start, end).sort).toEqual([]);
  });

  it.each(['not json', '', '   ', '{"query":}', '{'])('throws a JSON syntax error for %p', (input) => {
    expect(() => buildDslSearchBody(input, start, end)).toThrow(/Query DSL is not valid JSON/i);
  });

  it.each(['[1,2]', '"a string"', 'null', '42', 'true'])(
    'throws a shape error for valid JSON that is not an object: %p',
    (input) => {
      expect(() => buildDslSearchBody(input, start, end)).toThrow(/Query DSL must be a JSON object/i);
    },
  );

  it.each([
    ['false', false],
    ['null', false],
    ['""', false],
    ['0', false],
    ['[]', false],
    ['false', true],
    ['null', true],
    ['[]', true],
  ])('rejects a present but non-object query %s (disableTimeFilter=%s)', (query, disableTimeFilter) => {
    expect(() => buildDslSearchBody(`{"query":${query}}`, start, end, { disableTimeFilter })).toThrow(
      /Query DSL "query" must be a JSON object/i,
    );
  });
});
