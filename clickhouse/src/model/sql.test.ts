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

import { asSubquery, quoteString, quoteTableName, selectedColumns, stripFormat, stripOrderAndLimit } from './sql';

describe('quoteString', () => {
  it('escapes the characters ending a ClickHouse string literal', () => {
    expect(quoteString("a'b\\")).toBe("'a\\'b\\\\'");
  });
});

describe('quoteTableName', () => {
  it('quotes a table and its database', () => {
    expect(quoteTableName('otel_traces')).toBe('`otel_traces`');
    expect(quoteTableName('otel.otel_traces')).toBe('`otel`.`otel_traces`');
  });

  it('rejects anything that is not a table name', () => {
    expect(() => quoteTableName('otel_traces WHERE 1 = 1')).toThrow(/Invalid ClickHouse table name/);
    expect(() => quoteTableName('a.b.c')).toThrow();
  });
});

describe('asSubquery', () => {
  it('keeps a trailing line comment from commenting out the closing parenthesis', () => {
    expect(asSubquery('SELECT 1 -- one\n;')).toBe('(\nSELECT 1 -- one\n)');
  });
});

describe('stripOrderAndLimit', () => {
  it('removes the final ORDER BY, LIMIT and FORMAT clauses', () => {
    expect(stripOrderAndLimit('SELECT a FROM t WHERE b ORDER BY a DESC LIMIT 10 OFFSET 5;')).toBe(
      'SELECT a FROM t WHERE b',
    );
    expect(stripOrderAndLimit('SELECT a FROM t LIMIT 10 FORMAT JSON')).toBe('SELECT a FROM t');
  });

  it('keeps the settings of the statement', () => {
    expect(stripOrderAndLimit('SELECT a FROM t ORDER BY a LIMIT 10 SETTINGS max_threads = 2')).toBe(
      'SELECT a FROM t\nSETTINGS max_threads = 2',
    );
  });

  it('leaves the clauses of subqueries, window functions, strings and comments alone', () => {
    const sql = [
      "SELECT a, 'ORDER BY x LIMIT 1' AS text, row_number() OVER (PARTITION BY b ORDER BY c) AS n",
      'FROM (SELECT * FROM t ORDER BY a LIMIT 5) -- ORDER BY comment',
      'GROUP BY a',
    ].join('\n');

    expect(stripOrderAndLimit(`${sql}\nORDER BY a`)).toBe(sql);
  });

  it('gives up on statements that can not be cut safely', () => {
    expect(stripOrderAndLimit('SELECT a FROM t UNION ALL SELECT a FROM u LIMIT 10')).toBeUndefined();
    expect(stripOrderAndLimit('SELECT a FROM t EXCEPT (SELECT a FROM u) LIMIT 10')).toBeUndefined();
    // LIMIT BY selects rows: removing it would count other rows.
    expect(stripOrderAndLimit('SELECT a FROM t ORDER BY b LIMIT 1 BY a')).toBeUndefined();
  });
});

describe('stripFormat', () => {
  it('removes the final FORMAT clause of a statement, which queries used to end with', () => {
    expect(stripFormat('SELECT a FROM t ORDER BY a FORMAT JSON;')).toBe('SELECT a FROM t ORDER BY a');
    expect(stripFormat("SELECT formatDateTime(t, '%F') AS format FROM (SELECT 1 FORMAT) -- FORMAT JSON")).toBe(
      "SELECT formatDateTime(t, '%F') AS format FROM (SELECT 1 FORMAT) -- FORMAT JSON",
    );
  });
});

describe('selectedColumns', () => {
  it('lists the aliases and the plain columns', () => {
    expect(
      selectedColumns('SELECT DISTINCT t.Timestamp, toString(a, b) AS `my body`, Level FROM (SELECT x FROM y) AS t'),
    ).toEqual({ names: ['Timestamp', 'my body', 'Level'], hasWildcard: false, excluded: [] });
  });

  it('tells that a wildcard selects columns it can not name, and the ones it leaves out', () => {
    expect(selectedColumns('SELECT *, a AS b FROM t')).toEqual({ names: ['b'], hasWildcard: true, excluded: [] });
    expect(selectedColumns('SELECT * EXCEPT (Body, `Trace Id`), t.* EXCEPT SpanId FROM t')).toEqual({
      names: [],
      hasWildcard: true,
      excluded: ['Body', 'Trace Id', 'SpanId'],
    });
  });
});
