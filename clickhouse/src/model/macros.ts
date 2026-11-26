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

import type { VariableStateMap } from '@perses-dev/plugin-system';
import { parseVariables } from '@perses-dev/plugin-system';
import type { AbsoluteTimeRange } from '@perses-dev/spec';

import { blankComments, commentRanges, isInRanges, quotedRanges } from './sql';

/**
 * Macros of the ClickHouse queries. Their names and expansions follow the ones of the Grafana ClickHouse datasource,
 * so that queries written for it can be reused. The longest names come first: `$__timeFilter` is a prefix of
 * `$__timeFilter_ms`.
 */
export const MACRO_NAMES = [
  '__timeFilter_ms',
  '__timeFilter',
  '__dateTimeFilter',
  '__dateFilter',
  '__timeInterval_ms',
  '__timeInterval',
  '__fromTime_ms',
  '__fromTime',
  '__toTime_ms',
  '__toTime',
  '__interval_ms',
  '__interval_s',
  '__conditionalAll',
] as const;

type MacroName = (typeof MACRO_NAMES)[number];

const MACRO_NAME_SET: ReadonlySet<string> = new Set(MACRO_NAMES);
const MACRO = new RegExp(String.raw`\$(${MACRO_NAMES.join('|')})\b`, 'g');
const ARGUMENT_COUNT: Partial<Record<MacroName, number>> = {
  __timeFilter_ms: 1,
  __timeFilter: 1,
  __dateTimeFilter: 2,
  __dateFilter: 1,
  __timeInterval_ms: 1,
  __timeInterval: 1,
  __conditionalAll: 2,
};

export interface MacroContext {
  /** Time range of the query. Macros reading it throw when it is not set. */
  timeRange?: AbsoluteTimeRange;
  /** Interval between two data points, in milliseconds. */
  intervalMs: number;
  variableState: VariableStateMap;
}

/** isMacroName reports whether a `$name` reference is a macro rather than a dashboard variable. */
export function isMacroName(name: string): boolean {
  return MACRO_NAME_SET.has(name);
}

/**
 * parseQueryVariables lists the dashboard variables referenced by a query, leaving the macros out, and the comments,
 * where variables are not replaced.
 */
export function parseQueryVariables(sql: string): string[] {
  return parseVariables(blankComments(sql)).filter((name) => !isMacroName(name));
}

/**
 * formatClickHouseDateTime writes a date as `YYYY-MM-DD hh:mm:ss` in UTC, the value of the `{start}` and `{end}`
 * placeholders.
 */
export function formatClickHouseDateTime(date: Date): string {
  return date
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, '');
}

/** replaceTimeRangePlaceholders replaces the `{start}` and `{end}` placeholders of a query. */
export function replaceTimeRangePlaceholders(sql: string, start?: string, end?: string): string {
  return sql.replaceAll('{start}', start ?? '{start}').replaceAll('{end}', end ?? '{end}');
}

// Reads the arguments of a macro call whose opening parenthesis is at `open`. Commas inside nested parentheses or
// quotes do not split arguments.
function readArguments(sql: string, open: number): { args: string[]; end: number } | undefined {
  const args: string[] = [];
  let depth = 0;
  let argumentStart = open + 1;
  for (let index = open; index < sql.length; index++) {
    const char = sql[index];
    if (char === "'" || char === '"' || char === '`') {
      index++;
      while (index < sql.length && sql[index] !== char) {
        index += sql[index] === '\\' ? 2 : 1;
      }
    } else if (char === '(' || char === '[') {
      depth++;
    } else if (char === ')' || char === ']') {
      depth--;
      if (depth === 0) {
        args.push(sql.slice(argumentStart, index).trim());
        return { args, end: index + 1 };
      }
    } else if (char === ',' && depth === 1) {
      args.push(sql.slice(argumentStart, index).trim());
      argumentStart = index + 1;
    }
  }
  return undefined;
}

function isAllSelected(name: string | undefined, variableState: VariableStateMap): boolean {
  const state = name === undefined ? undefined : variableState[name];
  if (!state) return false;
  // Perses resolves the "All" value to its custom value, or to every option with "All" as display value.
  return state.customAllValue !== undefined || state.displayValue === 'All';
}

// Writes the UTC date of a time, moved by a number of days, as a ClickHouse date.
function dateLiteral(date: Date, days: number): string {
  return `toDate('${new Date(date.getTime() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}')`;
}

function requireTimeRange(name: MacroName, timeRange: AbsoluteTimeRange | undefined): AbsoluteTimeRange {
  if (!timeRange) {
    throw new Error(`The $${name} macro needs a time range, which is not available for this query`);
  }
  return timeRange;
}

function expandMacro(name: MacroName, args: string[], context: MacroContext): string {
  const { intervalMs, variableState } = context;
  switch (name) {
    case '__interval_s':
      return String(Math.max(1, Math.round(intervalMs / 1000)));
    case '__interval_ms':
      return String(Math.max(1, Math.round(intervalMs)));
    case '__timeInterval':
      return `toStartOfInterval(toDateTime(${args[0]}), INTERVAL ${Math.max(1, Math.round(intervalMs / 1000))} second)`;
    case '__timeInterval_ms':
      return `toStartOfInterval(toDateTime64(${args[0]}, 3), INTERVAL ${Math.max(1, Math.round(intervalMs))} millisecond)`;
    case '__conditionalAll':
      return isAllSelected(parseVariables(args[1] ?? '')[0], variableState) ? '1=1' : (args[0] ?? '');
    default:
      break;
  }

  const { start, end } = requireTimeRange(name, context.timeRange);
  const fromSeconds = `toDateTime(${Math.floor(start.getTime() / 1000)})`;
  const toSeconds = `toDateTime(${Math.ceil(end.getTime() / 1000)})`;
  const fromMillis = `fromUnixTimestamp64Milli(${start.getTime()})`;
  const toMillis = `fromUnixTimestamp64Milli(${end.getTime()})`;
  const dateFilter = (column: string | undefined, marginDays = 0): string =>
    `${column} >= ${dateLiteral(start, -marginDays)} AND ${column} <= ${dateLiteral(end, marginDays)}`;
  const timeFilter = (column: string | undefined): string =>
    `${column} >= ${fromSeconds} AND ${column} <= ${toSeconds}`;
  switch (name) {
    case '__timeFilter':
      return `(${timeFilter(args[0])})`;
    case '__timeFilter_ms':
      return `(${args[0]} >= ${fromMillis} AND ${args[0]} <= ${toMillis})`;
    case '__dateFilter':
      return `(${dateFilter(args[0])})`;
    case '__dateTimeFilter':
      // The dates are in UTC, while the date column may be computed in another time zone, e.g. `toDate(Timestamp)` in
      // the one of the server. A day more on each side keeps the rows of the time range: the time filter cuts them.
      return `(${dateFilter(args[0], 1)} AND ${timeFilter(args[1])})`;
    case '__fromTime':
      return fromSeconds;
    case '__toTime':
      return toSeconds;
    case '__fromTime_ms':
      return fromMillis;
    default:
      return toMillis;
  }
}

// Yields the references to macros of a query. The ones in its comments are left out: a comment mentioning a macro
// must not make the query fail. So are the macros taking arguments in its strings, e.g. `LIKE '%$__timeFilter%'`:
// they write expressions, which have no place in a string. The other ones are values, replaced in strings too, like
// the dashboard variables.
function* macroReferences(sql: string): Generator<{ name: MacroName; start: number; end: number }> {
  const comments = commentRanges(sql);
  const quoted = quotedRanges(sql);
  for (const match of sql.matchAll(MACRO)) {
    const start = match.index;
    const name = match[1] as MacroName;
    if (isInRanges(start, comments)) continue;
    if (ARGUMENT_COUNT[name] !== undefined && isInRanges(start, quoted)) continue;
    yield { name, start, end: start + match[0].length };
  }
}

/**
 * expandMacros replaces the `$__macro` and `$__macro(arguments)` references of a query. It must run before the
 * dashboard variables are replaced: `$__fromTime` would otherwise be read as the `$__from` variable.
 */
export function expandMacros(sql: string, context: MacroContext): string {
  let result = '';
  let position = 0;
  for (const reference of macroReferences(sql)) {
    // Already replaced, as part of an argument of the previous macro.
    if (reference.start < position) continue;
    const { name } = reference;
    const expected = ARGUMENT_COUNT[name];
    let args: string[] = [];
    let { end } = reference;
    if (expected !== undefined) {
      const call = sql[end] === '(' ? readArguments(sql, end) : undefined;
      if (!call || call.args.length !== expected || call.args.some((argument) => argument === '')) {
        throw new Error(`The $${name} macro expects ${expected} argument${expected > 1 ? 's' : ''}`);
      }
      args = call.args.map((argument) => expandMacros(argument, context));
      end = call.end;
    }
    result += sql.slice(position, reference.start) + expandMacro(name, args, context);
    position = end;
  }
  return result + sql.slice(position);
}
