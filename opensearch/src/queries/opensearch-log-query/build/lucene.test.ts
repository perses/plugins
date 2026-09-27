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

import { buildLuceneSearchBody } from './lucene';

const start = new Date('2025-01-01T00:00:00.000Z'); // 1735689600000
const end = new Date('2025-01-01T01:00:00.000Z'); //   1735693200000

const timeFilter = {
  range: { '@timestamp': { gte: 1735689600000, lte: 1735693200000, format: 'epoch_millis' } },
};

describe('buildLuceneSearchBody', () => {
  it('wraps the user query in a query_string clause beside the time range', () => {
    expect(buildLuceneSearchBody('level:error AND service:api', start, end)).toEqual({
      size: 500,
      sort: [{ '@timestamp': { order: 'desc', unmapped_type: 'boolean' } }],
      query: {
        bool: {
          filter: [timeFilter, { query_string: { query: 'level:error AND service:api', analyze_wildcard: true } }],
        },
      },
    });
  });

  it('drops the query_string clause for a blank query, leaving the time window', () => {
    const body = buildLuceneSearchBody('   ', start, end);
    expect(body.query).toEqual({ bool: { filter: [timeFilter] } });
  });

  it('honours limit as the search size', () => {
    expect(buildLuceneSearchBody('*', start, end, { limit: 25 }).size).toBe(25);
  });

  // The CUE schema constrains `limit` to `int & >0`, so `limit: 0` cannot reach here from a
  // validated dashboard. This test pins the `??` operator choice in resolveSize, not `size: 0`
  // as a supported use case — do not "fix" it by switching resolveSize to `||`.
  it('preserves an explicit limit of 0 rather than falling back to the default size', () => {
    expect(buildLuceneSearchBody('*', start, end, { limit: 0 }).size).toBe(0);
  });

  it('sorts and filters on the configured timestamp field', () => {
    const body = buildLuceneSearchBody('*', start, end, { timestampField: 'event.time' });
    expect(body.sort).toEqual([{ 'event.time': { order: 'desc', unmapped_type: 'boolean' } }]);
    expect(body.query).toEqual({
      bool: {
        filter: [
          { range: { 'event.time': { gte: 1735689600000, lte: 1735693200000, format: 'epoch_millis' } } },
          { query_string: { query: '*', analyze_wildcard: true } },
        ],
      },
    });
  });

  it('omits the range clause when disableTimeFilter is set', () => {
    const body = buildLuceneSearchBody('level:error', start, end, { disableTimeFilter: true });
    expect(body.query).toEqual({
      bool: { filter: [{ query_string: { query: 'level:error', analyze_wildcard: true } }] },
    });
  });
});
