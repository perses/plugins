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

import { DEFAULT_TIMESTAMP_FIELD } from './search';

/**
 * Bound the query to the panel time range using a PPL `where` clause on the
 * configured timestamp field (`@timestamp` by default).
 * The bound is injected immediately after the source clause so it runs before any
 * pipe that drops the timestamp column from the schema (stats, fields, top, etc.).
 * If the user already filters on the timestamp field themselves, PPL ANDs the two clauses.
 */
export interface BoundedPPLOptions {
  index?: string;
  timestampField?: string;
  disableTimeFilter?: boolean;
}

/**
 * Escape a user-supplied identifier (timestamp field name) for safe interpolation
 * inside a PPL backtick-quoted identifier. A backtick in the value would otherwise
 * close the quoting early and let the rest of the string be parsed as PPL, producing
 * an invalid — or potentially injected — query. PPL escapes a literal backtick by
 * doubling it.
 */
function escapeIdentifier(name: string): string {
  return name.replace(/`/g, '``');
}

/**
 * Sanitize a user-supplied index name/pattern before embedding it in a `source=`
 * clause. Unlike the timestamp field, `source=` is not backtick-quoted and must
 * keep wildcards (`*`) and multi-index commas intact, so we can't just quote it.
 * Instead we strip the characters that could terminate the clause and inject an
 * extra PPL stage (backtick, pipe, quotes) or that are simply invalid in an index
 * name (whitespace) — e.g. `logs-* | delete` would otherwise smuggle in a pipe.
 */
function sanitizeIndex(index: string): string {
  return index.replace(/[`|'"\s]/g, '');
}

/** Join PPL stages with ` | `, dropping any empty segments so we never emit a dangling pipe. */
function joinPPLStages(stages: string[]): string {
  return stages.filter((stage) => stage.trim().length > 0).join(' | ');
}

export function buildBoundedPPL(
  userQuery: string,
  start: Date,
  end: Date,
  { index, timestampField = DEFAULT_TIMESTAMP_FIELD, disableTimeFilter = false }: BoundedPPLOptions = {}
): string {
  let trimmed = userQuery.trim();

  if (index && !/^(?:search\s+)?source\s*=/i.test(trimmed)) {
    trimmed = `source=${sanitizeIndex(index)} | ${trimmed}`;
  }

  // Skip the auto-injected time-range clause when the caller manages their own time
  // bounds (disableTimeFilter).
  if (disableTimeFilter) {
    return trimmed;
  }

  const startIso = start.toISOString();
  const endIso = end.toISOString();
  // timestampField is user-editable, so escape it before embedding it in the
  // backtick-quoted identifier (the ISO bounds are machine-generated and safe).
  const tsField = escapeIdentifier(timestampField);
  const bound = `where \`${tsField}\` >= '${startIso}' and \`${tsField}\` <= '${endIso}'`;

  const firstPipe = trimmed.indexOf('|');
  if (firstPipe === -1) {
    return joinPPLStages([trimmed, bound]);
  }

  const sourceClause = trimmed.slice(0, firstPipe).trimEnd();
  const rest = trimmed.slice(firstPipe + 1).trimStart();
  // `rest` can be empty (e.g. a trailing pipe or an empty query), so join through a
  // filter to avoid producing an invalid `... | ` dangling stage.
  return joinPPLStages([sourceClause, bound, rest]);
}
