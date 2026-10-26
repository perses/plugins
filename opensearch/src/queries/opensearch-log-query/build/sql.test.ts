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

import { buildSqlRequest, UNSUPPORTED_SQL_TIME_FILTER_MESSAGE } from './sql';

const start = new Date('2025-01-01T00:00:00.000Z');
const end = new Date('2025-01-01T01:00:00.000Z');

const bound = "(`@timestamp` >= '2025-01-01 00:00:00.000' AND `@timestamp` <= '2025-01-01 01:00:00.000')";

const build = (sql: string): string => buildSqlRequest(sql, start, end).query;

describe('buildSqlRequest', () => {
  it('never sends the legacy-engine filter field', () => {
    expect(buildSqlRequest('SELECT * FROM logs', start, end)).toEqual({ query: `SELECT * FROM logs WHERE ${bound}` });
  });

  it.each([
    ['appends a WHERE at the end', 'SELECT * FROM logs', `SELECT * FROM logs WHERE ${bound}`],
    [
      'inserts a WHERE before LIMIT',
      'SELECT * FROM app-logs LIMIT 20',
      `SELECT * FROM app-logs WHERE ${bound} LIMIT 20`,
    ],
    [
      'inserts a WHERE before GROUP BY',
      'SELECT level, count(*) FROM logs GROUP BY level ORDER BY level',
      `SELECT level, count(*) FROM logs WHERE ${bound} GROUP BY level ORDER BY level`,
    ],
    [
      'inserts a WHERE before ORDER BY',
      'select * from logs order by `@timestamp` desc',
      `select * from logs WHERE ${bound} order by \`@timestamp\` desc`,
    ],
    [
      'ANDs in front of an existing WHERE and parenthesises it',
      "SELECT * FROM logs WHERE level = 'ERROR' OR level = 'WARN' LIMIT 5",
      `SELECT * FROM logs WHERE ${bound} AND (level = 'ERROR' OR level = 'WARN') LIMIT 5`,
    ],
    [
      'keeps new-engine functions in the WHERE intact',
      "SELECT * FROM app-logs WHERE match(message, 'timeout') LIMIT 20",
      `SELECT * FROM app-logs WHERE ${bound} AND (match(message, 'timeout')) LIMIT 20`,
    ],
    [
      'ignores keywords inside string literals',
      "SELECT * FROM logs WHERE message = 'limit where order by' LIMIT 3",
      `SELECT * FROM logs WHERE ${bound} AND (message = 'limit where order by') LIMIT 3`,
    ],
    [
      'ignores keywords inside escaped quotes',
      "SELECT * FROM logs WHERE a = 'it''s limit' AND b = 'x\\' limit'",
      `SELECT * FROM logs WHERE ${bound} AND (a = 'it''s limit' AND b = 'x\\' limit')`,
    ],
    [
      'ignores keywords inside backtick identifiers',
      'SELECT `limit` FROM logs WHERE `order` > 1',
      `SELECT \`limit\` FROM logs WHERE ${bound} AND (\`order\` > 1)`,
    ],
    [
      'ignores keywords inside parentheses',
      'SELECT EXTRACT(YEAR FROM ts) FROM logs WHERE x IN (SELECT y FROM other LIMIT 1)',
      `SELECT EXTRACT(YEAR FROM ts) FROM logs WHERE ${bound} AND (x IN (SELECT y FROM other LIMIT 1))`,
    ],
    [
      'places the WHERE before a trailing line comment',
      'SELECT * FROM logs -- recent errors',
      `SELECT * FROM logs WHERE ${bound} -- recent errors`,
    ],
    [
      'closes the condition before a comment ahead of the next clause',
      'SELECT * FROM logs WHERE a = 1 -- note\nLIMIT 5',
      `SELECT * FROM logs WHERE ${bound} AND (a = 1) -- note\nLIMIT 5`,
    ],
    [
      'ignores keywords inside block comments',
      'SELECT * /* from limit */ FROM logs',
      `SELECT * /* from limit */ FROM logs WHERE ${bound}`,
    ],
    ['drops a trailing semicolon', 'SELECT * FROM logs LIMIT 5;', `SELECT * FROM logs WHERE ${bound} LIMIT 5`],
  ])('%s', (_, input, expected) => {
    expect(build(input)).toBe(expected);
  });

  it('uses the configured timestamp field and escapes backticks in it', () => {
    expect(buildSqlRequest('SELECT * FROM logs', start, end, { timestampField: 'event.time' }).query).toContain(
      "`event.time` >= '2025-01-01 00:00:00.000'",
    );
    expect(buildSqlRequest('SELECT * FROM logs', start, end, { timestampField: 'a`b' }).query).toContain('`a``b` >=');
  });

  it.each([
    ['a UNION', 'SELECT a FROM x UNION SELECT a FROM y'],
    ['a JOIN', 'SELECT * FROM x JOIN y ON x.id = y.id'],
    ['a query without FROM', 'SELECT 1'],
    ['a non-SELECT statement', 'SHOW TABLES LIKE logs%'],
    ['a DESCRIBE statement', 'DESCRIBE TABLES LIKE logs'],
  ])('rejects %s rather than guessing where the bound goes', (_, input) => {
    expect(() => build(input)).toThrow(UNSUPPORTED_SQL_TIME_FILTER_MESSAGE);
  });

  it('sends the query unchanged apart from trimming when disableTimeFilter is set', () => {
    const request = buildSqlRequest('  SELECT a FROM x UNION SELECT a FROM y;  ', start, end, {
      disableTimeFilter: true,
    });
    expect(request).toEqual({ query: 'SELECT a FROM x UNION SELECT a FROM y' });
  });
});
