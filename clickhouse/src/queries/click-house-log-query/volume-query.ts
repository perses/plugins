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

import { asSubquery, quoteIdentifier, selectedColumns, stripOrderAndLimit } from '../../model/sql';
import { LOG_LEVEL_COLUMNS, LOG_TIME_COLUMNS } from './logs';

// Columns of the logs table of the OpenTelemetry Collector, assumed to be the ones a `SELECT *` returns.
const OTEL_TIME_COLUMN = 'Timestamp';
const OTEL_LEVEL_COLUMN = 'SeverityText';

function pickColumn(names: string[], candidates: readonly string[]): string | undefined {
  for (const candidate of candidates) {
    const name = names.find((column) => column.toLowerCase() === candidate);
    if (name !== undefined) return name;
  }
  return undefined;
}

/**
 * buildVolumeQuery derives, from a log query, the time series query counting its logs over time, split by level
 * when the logs have one. The log query is counted without its `ORDER BY` and `LIMIT` clauses: the volume is the one
 * of all the matching logs, not only of the ones displayed.
 *
 * It returns undefined when the log query can not be rewritten: its time column is not found, or it can not be
 * stripped from its limit.
 */
export function buildVolumeQuery(logQuery: string): string | undefined {
  const statement = stripOrderAndLimit(logQuery);
  const selected = statement === undefined ? undefined : selectedColumns(statement);
  if (statement === undefined || selected === undefined) return undefined;

  // A column of the OpenTelemetry logs table a wildcard is assumed to return, unless it leaves it out.
  const behindWildcard = (column: string): string | undefined =>
    selected.hasWildcard && !selected.excluded.some((name) => name.toLowerCase() === column.toLowerCase())
      ? column
      : undefined;
  const time = pickColumn(selected.names, LOG_TIME_COLUMNS) ?? behindWildcard(OTEL_TIME_COLUMN);
  if (time === undefined) return undefined;
  const level = pickColumn(selected.names, LOG_LEVEL_COLUMNS) ?? behindWildcard(OTEL_LEVEL_COLUMN);

  const columns = [`$__timeInterval(${quoteIdentifier(time)}) AS time`];
  if (level !== undefined) {
    // Lower case, so that the logs of services writing their levels differently, e.g. ERROR and error, add up. A
    // missing level of a Nullable column is an unknown one too.
    const text = `lower(ifNull(toString(${quoteIdentifier(level)}), ''))`;
    columns.push(`if(${text} = '', 'unknown', ${text}) AS level`);
  }
  columns.push('count() AS logs');
  return [
    `SELECT ${columns.join(', ')}`,
    `FROM ${asSubquery(statement)}`,
    `GROUP BY ${level === undefined ? 'time' : 'time, level'}`,
    'ORDER BY time',
  ].join('\n');
}
