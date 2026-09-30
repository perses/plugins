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

export type InfluxDBTimeFormat = 'iso8601' | 'unix';

/**
 * Replace InfluxDB builtin variable placeholders in an InfluxQL or SQL query.
 *
 * Supported macros:
 *   $__timeFrom / ${__timeFrom}     — start of time range
 *   $__timeTo   / ${__timeTo}       — end of time range
 *   $__timeFilter(field)            — field >= start AND field <= end
 *   $__interval                     — interval in seconds
 *   $__interval_ms                  — interval in milliseconds
 */
export function replaceInfluxDBBuiltinVariables(
  query: string,
  timeRange: AbsoluteTimeRange,
  intervalMs: number,
  timeFormat: InfluxDBTimeFormat = 'iso8601'
): string {
  const fromUnix = Math.floor(timeRange.start.getTime() / 1000);
  const toUnix = Math.floor(timeRange.end.getTime() / 1000);

  const fromValue = timeFormat === 'unix' ? fromUnix.toString() : `'${timeRange.start.toISOString()}'`;
  const toValue = timeFormat === 'unix' ? toUnix.toString() : `'${timeRange.end.toISOString()}'`;

  let result = query;

  result = result.replace(/\$__timeFrom\b/g, fromValue);
  result = result.replace(/\$\{__timeFrom\}/g, fromValue);
  result = result.replace(/\$__timeTo\b/g, toValue);
  result = result.replace(/\$\{__timeTo\}/g, toValue);

  const intervalSeconds = Math.floor(intervalMs / 1000);
  result = result.replace(/\$__interval_ms\b/g, intervalMs.toString());
  result = result.replace(/\$\{__interval_ms\}/g, intervalMs.toString());
  result = result.replace(/\$__interval\b/g, intervalSeconds.toString());
  result = result.replace(/\$\{__interval\}/g, intervalSeconds.toString());

  // InfluxDB time filter: field >= start AND field <= end
  const timeFilterRegex = /\$__timeFilter\(([\w."'`]+(?:\.[\w."'`]+)*)\)/g;
  if (timeFormat === 'unix') {
    result = result.replace(timeFilterRegex, (_, field: string) => `${field} >= ${fromUnix} AND ${field} <= ${toUnix}`);
  } else {
    result = result.replace(
      timeFilterRegex,
      (_, field: string) =>
        `${field} >= '${timeRange.start.toISOString()}' AND ${field} <= '${timeRange.end.toISOString()}'`
    );
  }

  return result;
}
