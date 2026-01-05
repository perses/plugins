// Copyright 2025 The Perses Authors
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

import { replaceVariable } from '@perses-dev/plugin-system';

/**
 * Format a Date as a ClickHouse DateTime string (YYYY-MM-DD HH:MM:SS)
 */
function formatClickHouseDateTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

/**
 * Replace ClickHouse built-in variable placeholders in a query
 *
 * Supported variables:
 * - $__timeFrom / $__timeTo - Time range as ClickHouse DateTime (YYYY-MM-DD HH:MM:SS)
 * - $__timeFrom_ms / $__timeTo_ms - Time range as Unix milliseconds
 * - $__interval - Step interval in seconds (for toStartOfInterval)
 * - $__interval_ms - Step interval in milliseconds
 *
 * @param query The SQL query containing variable placeholders
 * @param start The start time of the query range
 * @param end The end time of the query range
 * @param intervalMs The step interval in milliseconds
 * @returns The query with variables replaced
 */
export function replaceClickHouseBuiltinVariables(
  query: string,
  start: Date,
  end: Date,
  intervalMs: number
): string {
  let updatedQuery = query;

  // Time range as ClickHouse DateTime format
  updatedQuery = replaceVariable(updatedQuery, '__timeFrom', formatClickHouseDateTime(start));
  updatedQuery = replaceVariable(updatedQuery, '__timeTo', formatClickHouseDateTime(end));

  // Time range as Unix milliseconds
  updatedQuery = replaceVariable(updatedQuery, '__timeFrom_ms', start.getTime().toString());
  updatedQuery = replaceVariable(updatedQuery, '__timeTo_ms', end.getTime().toString());

  // Interval
  const intervalSeconds = Math.floor(intervalMs / 1000);
  updatedQuery = replaceVariable(updatedQuery, '__interval', intervalSeconds.toString());
  updatedQuery = replaceVariable(updatedQuery, '__interval_ms', intervalMs.toString());

  return updatedQuery;
}
