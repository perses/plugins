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

import type { OpenSearchSQLParams } from '../../../model/opensearch-client';
import { DEFAULT_TIMESTAMP_FIELD } from './search';

export interface SqlRequestOptions {
  timestampField?: string;
  disableTimeFilter?: boolean;
}

export const UNSUPPORTED_SQL_TIME_FILTER_MESSAGE =
  'Automatic time filtering supports a single SELECT … FROM query without UNION or JOIN. ' +
  'Untick "Use dashboard time range" and filter on the timestamp field in your own WHERE clause instead, ' +
  'e.g. WHERE `@timestamp` >= FROM_UNIXTIME($__from / 1000.0) AND `@timestamp` <= FROM_UNIXTIME($__to / 1000.0).';

/** Keywords that end a WHERE clause (or mark where one must be inserted) in the outer query. */
const CLAUSES_AFTER_WHERE = new Set(['GROUP', 'HAVING', 'ORDER', 'LIMIT']);
/** Top-level keywords the splice can't reason about, so the query is rejected instead of guessed at. */
const UNSUPPORTED_KEYWORDS = new Set(['UNION', 'INTERSECT', 'EXCEPT', 'MINUS', 'JOIN']);

interface SqlKeyword {
  word: string;
  start: number;
  end: number;
  /** End of the last code character before this keyword, so a splice never lands inside a comment. */
  codeEndBefore: number;
}

interface ScannedSql {
  keywords: SqlKeyword[];
  /** End of the last code character (not whitespace or comment) in the whole query. */
  codeEnd: number;
}

/**
 * Collect the words outside parentheses, quotes and comments, which is enough to find the
 * outer query's clauses. Quoting follows the OpenSearch SQL lexer: '…', "…" and `…` may
 * escape a character with a backslash or by doubling the quote; `--` and `/* *\/` are comments.
 */
function scanTopLevelWords(sql: string): ScannedSql {
  const keywords: SqlKeyword[] = [];
  let depth = 0;
  let codeEnd = 0;
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i]!;

    if (ch === '-' && sql[i + 1] === '-') {
      const newline = sql.indexOf('\n', i);
      i = newline === -1 ? sql.length : newline;
      continue;
    }
    if (ch === '/' && sql[i + 1] === '*') {
      const close = sql.indexOf('*/', i + 2);
      i = close === -1 ? sql.length : close + 2;
      continue;
    }
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      i++;
      while (i < sql.length) {
        if (sql[i] === '\\') {
          i += 2;
        } else if (sql[i] === ch && sql[i + 1] === ch) {
          i += 2;
        } else if (sql[i] === ch) {
          i++;
          break;
        } else {
          i++;
        }
      }
      codeEnd = i;
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      const start = i;
      while (i < sql.length && /\w/.test(sql[i]!)) i++;
      if (depth === 0) {
        keywords.push({ word: sql.slice(start, i).toUpperCase(), start, end: i, codeEndBefore: codeEnd });
      }
      codeEnd = i;
      continue;
    }

    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    i++;
    codeEnd = i;
  }

  return { keywords, codeEnd };
}

/** Escape a user-supplied identifier for a backtick-quoted SQL identifier by doubling backticks. */
function escapeIdentifier(name: string): string {
  return name.replace(/`/g, '``');
}

/** UTC `yyyy-MM-dd HH:mm:ss.SSS`, the timestamp literal OpenSearch SQL compares against. */
function toSqlTimestamp(date: Date): string {
  return date.toISOString().replace('T', ' ').replace('Z', '');
}

/**
 * Add `bound` to the outer query's WHERE clause: ANDed in front of an existing condition
 * (wrapped in parentheses so its own ORs stay inside), or as a new WHERE placed before
 * GROUP BY / HAVING / ORDER BY / LIMIT, or at the end of the query.
 */
function spliceWhere(sql: string, bound: string): string {
  const { keywords, codeEnd } = scanTopLevelWords(sql);

  const froms = keywords.filter((k) => k.word === 'FROM');
  if (keywords[0]?.word !== 'SELECT' || froms.length !== 1 || keywords.some((k) => UNSUPPORTED_KEYWORDS.has(k.word))) {
    throw new Error(UNSUPPORTED_SQL_TIME_FILTER_MESSAGE);
  }

  const afterFrom = keywords.filter((k) => k.start > froms[0]!.start);
  const where = afterFrom.find((k) => k.word === 'WHERE');
  const next = afterFrom.find((k) => CLAUSES_AFTER_WHERE.has(k.word) && (!where || k.start > where.start));
  const clauseEnd = next ? next.codeEndBefore : codeEnd;

  if (where) {
    const condition = sql.slice(where.end, clauseEnd).trim();
    return `${sql.slice(0, where.start)}WHERE ${bound} AND (${condition})${sql.slice(clauseEnd)}`;
  }
  return `${sql.slice(0, clauseEnd)} WHERE ${bound}${sql.slice(clauseEnd)}`;
}

/**
 * Bound a SQL query to the panel time range by adding a condition on the timestamp field to
 * its WHERE clause, as PPL gets a `where` stage. The `_sql` API's `filter` request field is
 * deliberately not used: OpenSearch only supports it on the legacy SQL engine, which then
 * misreads sub-millisecond timestamps, rejects `date_nanos` fields and fails on new-engine
 * syntax such as `match(field, 'text') LIMIT n`.
 */
export function buildSqlRequest(
  userQuery: string,
  start: Date,
  end: Date,
  { timestampField = DEFAULT_TIMESTAMP_FIELD, disableTimeFilter = false }: SqlRequestOptions = {},
): OpenSearchSQLParams {
  // A trailing `;` would end the statement before an appended WHERE.
  const query = userQuery.trim().replace(/;+$/, '').trimEnd();

  if (disableTimeFilter) {
    return { query };
  }

  // timestampField is user-editable, so escape it before embedding it in the backtick-quoted
  // identifier (the bounds are machine-generated and safe).
  const tsField = `\`${escapeIdentifier(timestampField)}\``;
  const bound = `(${tsField} >= '${toSqlTimestamp(start)}' AND ${tsField} <= '${toSqlTimestamp(end)}')`;
  return { query: spliceWhere(query, bound) };
}
