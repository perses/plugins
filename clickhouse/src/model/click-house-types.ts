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

/** A column of a ClickHouse result: its name and its ClickHouse type, e.g. `LowCardinality(String)`. */
export interface ClickHouseColumn {
  name: string;
  type: string;
}

const WRAPPER_TYPE = /^(?:Nullable|LowCardinality)\((.*)\)$/s;
const TIME_TYPE = /^(?:Date|Date32|DateTime|DateTime64)(?:\(.*\))?$/s;
const NUMERIC_TYPE =
  /^(?:U?Int(?:8|16|32|64|128|256)|Float(?:32|64)|BFloat16|Decimal(?:32|64|128|256)?(?:\(.*\))?|Bool)$/;
const TIME_ZONE = /'([^']+)'\)$/;

/** unwrapType removes the `Nullable` and `LowCardinality` wrappers, which do not change how a value is read. */
export function unwrapType(type: string): string {
  let current = type.trim();
  for (let match = WRAPPER_TYPE.exec(current); match; match = WRAPPER_TYPE.exec(current)) {
    current = (match[1] ?? '').trim();
  }
  return current;
}

/** isTimeType reports whether the values of the type are dates or date/times. */
export function isTimeType(type: string): boolean {
  return TIME_TYPE.test(unwrapType(type));
}

/** isNumericType reports whether the values of the type are numbers. Booleans count: they plot as 0 and 1. */
export function isNumericType(type: string): boolean {
  return NUMERIC_TYPE.test(unwrapType(type));
}

/** isArrayType reports whether the values of the type are arrays. */
export function isArrayType(type: string): boolean {
  return unwrapType(type).startsWith('Array(');
}

/** getTypeTimeZone returns the time zone declared by a `DateTime('Zone')` or `DateTime64(3, 'Zone')` type. */
export function getTypeTimeZone(type: string): string | undefined {
  const unwrapped = unwrapType(type);
  return TIME_TYPE.test(unwrapped) ? TIME_ZONE.exec(unwrapped)?.[1] : undefined;
}

/**
 * findColumn returns the index of the first column named like one of the candidates, compared case-insensitively,
 * or -1. Candidates are tried in order: the first one has priority whatever the order of the columns.
 */
export function findColumn(columns: ClickHouseColumn[], candidates: readonly string[]): number {
  for (const candidate of candidates) {
    const index = columns.findIndex((column) => column.name.toLowerCase() === candidate);
    if (index !== -1) return index;
  }
  return -1;
}

/** Names of the column holding the timestamp of a row, by priority. */
export const TIME_COLUMNS = ['time', 'timestamp', 'timeunix'] as const;

/**
 * findTimeColumn returns the index of the column holding the timestamp of the rows: a column named `time`,
 * `timestamp` or `TimeUnix`, else the first date/time column. It returns -1 when there is none.
 */
export function findTimeColumn(columns: ClickHouseColumn[]): number {
  const named = findColumn(columns, TIME_COLUMNS);
  return named !== -1 ? named : columns.findIndex((column) => isTimeType(column.type));
}
