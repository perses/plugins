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

const TABLE_NAME = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?$/;

/** quoteString writes a value as a ClickHouse string literal. Backslashes are escape characters in ClickHouse. */
export function quoteString(value: string): string {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
}

/** quoteIdentifier writes a column or table name as a quoted ClickHouse identifier. */
export function quoteIdentifier(identifier: string): string {
  return `\`${identifier.replaceAll('\\', '\\\\').replaceAll('`', '\\`')}\``;
}

/** isTableName reports whether the text is a plain table name, optionally qualified by its database. */
export function isTableName(table: string): boolean {
  return TABLE_NAME.test(table);
}

/**
 * quoteTableName writes a table name, optionally qualified by its database, as quoted identifiers.
 * It throws when the name is not a plain `table` or `database.table`, so that it can not carry SQL.
 */
export function quoteTableName(table: string): string {
  if (!isTableName(table)) {
    throw new Error(`Invalid ClickHouse table name "${table}": expected "table" or "database.table"`);
  }
  return table.split('.').map(quoteIdentifier).join('.');
}

/**
 * asSubquery wraps a statement so that it can be read with `FROM`. The line breaks keep a trailing line comment of
 * the statement from commenting out the closing parenthesis.
 */
export function asSubquery(sql: string): string {
  return `(\n${sql.trim().replace(/(?:\s*;)+$/, '')}\n)`;
}

interface Token {
  kind: 'word' | 'comment';
  /** A word in upper case, or a comment as written. */
  text: string;
  start: number;
  depth: number;
}

const WORD_START = /[A-Za-z_]/;
const WORD_PART = /\w/;
const SETTINGS_CLAUSE = /^SETTINGS\s+\w+\s*=/i;
const FORMAT_CLAUSE = /^FORMAT\s+\w+\s*$/i;
const FINAL_SEMICOLONS = /(?:\s*;)+$/;
// What follows the `EXCEPT` of a set operation. After a wildcard, `EXCEPT` names the columns it leaves out.
const SET_OPERATION_OPERANDS = new Set(['SELECT', 'WITH', 'FROM', 'ALL', 'DISTINCT']);

// Yields the bare words and the comments of a statement, skipping its strings and quoted identifiers. Words come
// with their nesting depth.
function* scanTokens(sql: string): Generator<Token> {
  let depth = 0;
  let index = 0;
  while (index < sql.length) {
    const char = sql[index] ?? '';
    const next = sql[index + 1] ?? '';
    const start = index;
    if (char === "'" || char === '"' || char === '`') {
      index++;
      while (index < sql.length && sql[index] !== char) {
        index += sql[index] === '\\' ? 2 : 1;
      }
      index++;
    } else if ((char === '-' && next === '-') || char === '#') {
      const end = sql.indexOf('\n', index);
      index = end === -1 ? sql.length : end + 1;
      yield { kind: 'comment', text: sql.slice(start, index), start, depth };
    } else if (char === '/' && next === '*') {
      const end = sql.indexOf('*/', index + 2);
      index = end === -1 ? sql.length : end + 2;
      yield { kind: 'comment', text: sql.slice(start, index), start, depth };
    } else if (char === '(' || char === '[' || char === '{') {
      depth++;
      index++;
    } else if (char === ')' || char === ']' || char === '}') {
      depth--;
      index++;
    } else if (WORD_START.test(char)) {
      while (index < sql.length && WORD_PART.test(sql[index] ?? '')) index++;
      yield { kind: 'word', text: sql.slice(start, index).toUpperCase(), start, depth };
    } else {
      index++;
    }
  }
}

function scanWords(sql: string): Token[] {
  return [...scanTokens(sql)].filter((token) => token.kind === 'word');
}

/** commentRanges returns where the comments of a statement are, as `[start, end[` positions. */
export function commentRanges(sql: string): Array<[start: number, end: number]> {
  const ranges: Array<[number, number]> = [];
  for (const token of scanTokens(sql)) {
    if (token.kind === 'comment') ranges.push([token.start, token.start + token.text.length]);
  }
  return ranges;
}

/**
 * stripFormat removes the final `FORMAT` clause of a statement, and its final semicolons. The plugins choose the
 * format of the results themselves, and used to let queries name it.
 */
export function stripFormat(sql: string): string {
  const statement = sql.trim().replace(FINAL_SEMICOLONS, '');
  for (const word of scanWords(statement)) {
    if (word.depth === 0 && word.text === 'FORMAT' && FORMAT_CLAUSE.test(statement.slice(word.start))) {
      return statement.slice(0, word.start).trimEnd();
    }
  }
  return statement;
}

/**
 * stripOrderAndLimit removes the final `ORDER BY`, `LIMIT` and `FORMAT` clauses of a `SELECT` statement, so that the
 * statement can be aggregated over all its rows in a subquery. A `SETTINGS` clause is kept. It returns undefined
 * when the statement can not be rewritten safely: a set operation (`UNION`...), or a `LIMIT ... BY` clause, which
 * changes which rows are selected.
 */
export function stripOrderAndLimit(sql: string): string | undefined {
  const statement = sql.trim().replace(FINAL_SEMICOLONS, '');
  let orderBy: number | undefined;
  let limit: number | undefined;
  let settings: number | undefined;
  let format: number | undefined;
  let previous: Token | undefined;
  const words = scanWords(statement);
  for (let index = 0; index < words.length; index++) {
    const word = words[index];
    if (!word) continue;
    if (word.depth !== 0) {
      previous = undefined;
      continue;
    }
    if (word.text === 'UNION' || word.text === 'INTERSECT') return undefined;
    if (word.text === 'EXCEPT' && SET_OPERATION_OPERANDS.has(words[index + 1]?.text ?? '')) return undefined;
    if (word.text === 'BY') {
      if (previous?.text === 'ORDER') {
        orderBy = previous.start;
      } else if (limit !== undefined) {
        // `LIMIT n BY columns` comes after ORDER BY: it is the only BY that can follow a LIMIT.
        return undefined;
      }
    } else if (word.text === 'LIMIT') {
      limit = word.start;
    } else if (word.text === 'SETTINGS' && SETTINGS_CLAUSE.test(statement.slice(word.start))) {
      settings ??= word.start;
    } else if (word.text === 'FORMAT' && FORMAT_CLAUSE.test(statement.slice(word.start))) {
      format = word.start;
    }
    previous = word;
  }
  const tail = Math.min(settings ?? statement.length, format ?? statement.length);
  const body = statement.slice(0, Math.min(orderBy ?? tail, limit ?? tail, tail)).trimEnd();
  if (settings === undefined) return body;
  const settingsClause = statement.slice(settings, format !== undefined && format > settings ? format : undefined);
  return `${body}\n${settingsClause.trim()}`;
}

const COLUMN_ALIAS = /\sAS\s+(`[^`]+`|"[^"]+"|\w+)\s*$/i;
const COLUMN_NAME = /^(?:\w+\.)*(`[^`]+`|"[^"]+"|\w+)$/;

// Splits a list on its commas, leaving alone the ones inside parentheses, strings and quoted identifiers.
function splitList(list: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let itemStart = 0;
  for (let index = 0; index < list.length; index++) {
    const char = list[index];
    if (char === "'" || char === '"' || char === '`') {
      index++;
      while (index < list.length && list[index] !== char) {
        index += list[index] === '\\' ? 2 : 1;
      }
    } else if (char === '(' || char === '[' || char === '{') {
      depth++;
    } else if (char === ')' || char === ']' || char === '}') {
      depth--;
    } else if (char === ',' && depth === 0) {
      items.push(list.slice(itemStart, index));
      itemStart = index + 1;
    }
  }
  items.push(list.slice(itemStart));
  return items.map((item) => item.trim()).filter((item) => item !== '');
}

// `*`, `table.*` and `COLUMNS('regexp')`, with their modifiers.
const WILDCARD = /^(?:(?:\w+\.)*\*(?:\s|$)|COLUMNS\s*\()/i;
const EXCEPT_MODIFIER = /\bEXCEPT\s+(?:STRICT\s+)?(?:\(([^)]*)\)|(`[^`]+`|"[^"]+"|\w+))/gi;

export interface SelectedColumns {
  /** Names of the aliases and of the plain columns of the statement. */
  names: string[];
  /** True when the statement also returns columns selected with `*`, whose names are unknown. */
  hasWildcard: boolean;
  /** Names of the columns its wildcards leave out, with `* EXCEPT (...)`. */
  excluded: string[];
}

function unquote(name: string): string {
  return name.trim().replace(/^[`"]|[`"]$/g, '');
}

/**
 * selectedColumns lists the names of the columns returned by a `SELECT` statement, as far as they can be told from
 * its text. It returns undefined when the list of the selected columns is not found.
 */
export function selectedColumns(sql: string): SelectedColumns | undefined {
  let select: number | undefined;
  let from: number | undefined;
  for (const word of scanWords(sql)) {
    if (word.depth !== 0) continue;
    if (word.text === 'SELECT' && select === undefined) {
      select = word.start + word.text.length;
    } else if (word.text === 'FROM' && select !== undefined) {
      from = word.start;
      break;
    }
  }
  if (select === undefined) return undefined;
  const names: string[] = [];
  const excluded: string[] = [];
  let hasWildcard = false;
  for (const item of splitList(sql.slice(select, from).replace(/^\s*DISTINCT\s+/i, ''))) {
    if (WILDCARD.test(item)) {
      hasWildcard = true;
      for (const [, list, single] of item.matchAll(EXCEPT_MODIFIER)) {
        excluded.push(...(list ?? single ?? '').split(',').map(unquote));
      }
      continue;
    }
    const name = (COLUMN_ALIAS.exec(item) ?? COLUMN_NAME.exec(item))?.[1];
    if (name !== undefined) names.push(unquote(name));
  }
  return { names, hasWildcard, excluded };
}
