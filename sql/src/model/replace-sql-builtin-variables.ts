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

import { AbsoluteTimeRange } from '@perses-dev/core';

/**
 * Replace SQL builtin variable placeholders in a SQL query
 *
 * @param query The SQL query that contains variable placeholders
 * @param timeRange The absolute time range for the query
 * @param intervalMs The interval between data points in milliseconds
 *
 * @returns SQL query with variable placeholders replaced by their values
 */
export function replaceSQLBuiltinVariables(query: string, timeRange: AbsoluteTimeRange, intervalMs: number): string {
  let updatedQuery = query;

  // Replace $__timeFrom and ${__timeFrom}
  const timeFromISO = timeRange.start.toISOString();
  updatedQuery = updatedQuery.replace(/\$__timeFrom\b/g, `'${timeFromISO}'`);
  updatedQuery = updatedQuery.replace(/\$\{__timeFrom\}/g, `'${timeFromISO}'`);

  // Replace $__timeTo and ${__timeTo}
  const timeToISO = timeRange.end.toISOString();
  updatedQuery = updatedQuery.replace(/\$__timeTo\b/g, `'${timeToISO}'`);
  updatedQuery = updatedQuery.replace(/\$\{__timeTo\}/g, `'${timeToISO}'`);

  // Replace $__interval and ${__interval}
  const intervalSeconds = Math.floor(intervalMs / 1000);
  updatedQuery = updatedQuery.replace(/\$__interval\b/g, intervalSeconds.toString());
  updatedQuery = updatedQuery.replace(/\$\{__interval\}/g, intervalSeconds.toString());

  // Replace $__interval_ms and ${__interval_ms}
  updatedQuery = updatedQuery.replace(/\$__interval_ms\b/g, intervalMs.toString());
  updatedQuery = updatedQuery.replace(/\$\{__interval_ms\}/g, intervalMs.toString());

  // Replace $__timeFilter(column) macro
  const timeFilterRegex = /\$__timeFilter\((\w+)\)/g;
  updatedQuery = updatedQuery.replace(timeFilterRegex, (_, column) => {
    return `${column} BETWEEN '${timeFromISO}' AND '${timeToISO}'`;
  });

  return updatedQuery;
}

/**
 * Replace Unix timestamp format (seconds since epoch)
 */
export function replaceSQLBuiltinVariablesUnix(
  query: string,
  timeRange: AbsoluteTimeRange,
  intervalMs: number
): string {
  let updatedQuery = query;

  // Unix timestamps in seconds
  const timeFromUnix = Math.floor(timeRange.start.getTime() / 1000);
  const timeToUnix = Math.floor(timeRange.end.getTime() / 1000);

  updatedQuery = updatedQuery.replace(/\$__timeFrom\b/g, timeFromUnix.toString());
  updatedQuery = updatedQuery.replace(/\$\{__timeFrom\}/g, timeFromUnix.toString());
  updatedQuery = updatedQuery.replace(/\$__timeTo\b/g, timeToUnix.toString());
  updatedQuery = updatedQuery.replace(/\$\{__timeTo\}/g, timeToUnix.toString());

  // Replace interval
  const intervalSeconds = Math.floor(intervalMs / 1000);
  updatedQuery = updatedQuery.replace(/\$__interval\b/g, intervalSeconds.toString());
  updatedQuery = updatedQuery.replace(/\$\{__interval\}/g, intervalSeconds.toString());
  updatedQuery = updatedQuery.replace(/\$__interval_ms\b/g, intervalMs.toString());
  updatedQuery = updatedQuery.replace(/\$\{__interval_ms\}/g, intervalMs.toString());

  // Replace $__timeFilter(column) macro with numeric comparison
  const timeFilterRegex = /\$__timeFilter\((\w+)\)/g;
  updatedQuery = updatedQuery.replace(timeFilterRegex, (_, column) => {
    return `${column} BETWEEN ${timeFromUnix} AND ${timeToUnix}`;
  });

  return updatedQuery;
}
