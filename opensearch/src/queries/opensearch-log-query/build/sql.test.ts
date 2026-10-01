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

import { buildSqlRequest } from './sql';

const start = new Date('2025-01-01T00:00:00.000Z'); // 1735689600000
const end = new Date('2025-01-01T01:00:00.000Z'); //   1735693200000

describe('buildSqlRequest', () => {
  it('passes the user query through untouched apart from trimming', () => {
    const { query } = buildSqlRequest('  SELECT * FROM `logs-2025`  ', start, end);
    expect(query).toBe('SELECT * FROM `logs-2025`');
  });

  it('bounds the time range with a filter on @timestamp by default', () => {
    const { filter } = buildSqlRequest('SELECT * FROM logs', start, end);
    expect(filter).toEqual({
      range: { '@timestamp': { gte: 1735689600000, lte: 1735693200000, format: 'epoch_millis' } },
    });
  });

  it('uses the configured timestamp field', () => {
    const { filter } = buildSqlRequest('SELECT * FROM logs', start, end, { timestampField: 'event.time' });
    expect(filter).toEqual({
      range: { 'event.time': { gte: 1735689600000, lte: 1735693200000, format: 'epoch_millis' } },
    });
  });

  it('omits the filter entirely when disableTimeFilter is set', () => {
    const request = buildSqlRequest('SELECT * FROM logs', start, end, { disableTimeFilter: true });
    expect(request).toEqual({ query: 'SELECT * FROM logs' });
    expect('filter' in request).toBe(false);
  });
});
