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

import { AbsoluteTimeRange } from '@perses-dev/spec';

export type TimeFormat = 'iso8601' | 'unix';

/**
 * Replace SQL builtin variable placeholders in a SQL query.
 *
 * @param query The SQL query that contains variable placeholders
 * @param timeRange The absolute time range for the query
 * @param intervalMs The interval between data points in milliseconds
 * @param timeFormat How to format time values: 'iso8601' (quoted ISO string) or 'unix' (seconds since epoch)
 *
 * @returns SQL query with variable placeholders replaced by their values
 */
export function replaceSQLBuiltinVariables(
  query: string,
  timeRange: AbsoluteTimeRange,
  intervalMs: number,
  timeFormat: TimeFormat = 'iso8601'
): string {
  let updatedQuery = query;

  const timeFromUnix = Math.floor(timeRange.start.getTime() / 1000);
  const timeToUnix = Math.floor(timeRange.end.getTime() / 1000);

  const timeFromValue =
    timeFormat === 'unix' ? timeFromUnix.toString() : `'${timeRange.start.toISOString()}'`;
  const timeToValue =
    timeFormat === 'unix' ? timeToUnix.toString() : `'${timeRange.end.toISOString()}'`;

  updatedQuery = updatedQuery.replace(/\$__timeFrom\b/g, timeFromValue);
  updatedQuery = updatedQuery.replace(/\$\{__timeFrom\}/g, timeFromValue);
  updatedQuery = updatedQuery.replace(/\$__timeTo\b/g, timeToValue);
  updatedQuery = updatedQuery.replace(/\$\{__timeTo\}/g, timeToValue);

  const intervalSeconds = Math.floor(intervalMs / 1000);
  updatedQuery = updatedQuery.replace(/\$__interval\b/g, intervalSeconds.toString());
  updatedQuery = updatedQuery.replace(/\$\{__interval\}/g, intervalSeconds.toString());
  updatedQuery = updatedQuery.replace(/\$__interval_ms\b/g, intervalMs.toString());
  updatedQuery = updatedQuery.replace(/\$\{__interval_ms\}/g, intervalMs.toString());

  const timeFilterRegex = /\$__timeFilter\(([\w."'`]+(?:\.[\w."'`]+)*)\)/g;
  if (timeFormat === 'unix') {
    updatedQuery = updatedQuery.replace(timeFilterRegex, (_, column) => {
      return `${column} BETWEEN ${timeFromUnix} AND ${timeToUnix}`;
    });
  } else {
    updatedQuery = updatedQuery.replace(timeFilterRegex, (_, column) => {
      return `${column} BETWEEN '${timeRange.start.toISOString()}' AND '${timeRange.end.toISOString()}'`;
    });
  }

  return updatedQuery;
}
