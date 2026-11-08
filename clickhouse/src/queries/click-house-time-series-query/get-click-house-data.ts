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

import type { TimeSeriesQueryPlugin } from '@perses-dev/plugin-system';
import { replaceVariables } from '@perses-dev/plugin-system';
import type { TimeSeries } from '@perses-dev/spec';

import type { ClickHouseClient, ClickHouseQueryResponse } from '../../model/click-house-client';
import { formatClickHouseDateTime, replaceTimeRangePlaceholders } from '../../model/click-house-client';
import type { TimeSeriesEntry } from '../../model/click-house-data-types';
import { DEFAULT_DATASOURCE } from '../constants';
import type { ClickHouseTimeSeriesQuerySpec, DatasourceQueryResponse } from './click-house-query-types';

const DEFAULT_STEP_MS = 30 * 1000;

/**
 * A result is read as a time range only when it has a column called `time`, the same alias the Grafana
 * ClickHouse datasource requires to recognise a time series. Without one, the result is read as a set
 * of records and each row becomes its own series (see #841).
 */
const TIME_COLUMN_NAME = 'time';

/**
 * Label key carrying the value column when a single result holds several of them, so consumers that
 * read rows rather than series (the Table panel) can still tell the measurements apart.
 */
const VALUE_COLUMN_LABEL = 'metric';

type Row = Record<string, unknown>;

interface RowShape {
  timeColumn?: string;
  valueColumns: string[];
  labelColumns: string[];
}

function toTimeSeriesValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function isNumericCell(value: unknown): boolean {
  if (value === null || value === undefined || value === '') {
    return true;
  }
  return Number.isFinite(Number(value));
}

function isTimestampCell(value: unknown): boolean {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (typeof value !== 'string') {
    return false;
  }
  // Numeric strings are values, not timestamps: `new Date('41')` happily resolves to the year 41.
  if (Number.isFinite(Number(value))) {
    return false;
  }
  return Number.isFinite(Date.parse(value));
}

function listColumns(rows: Row[]): string[] {
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const column of Object.keys(row)) {
      if (!seen.has(column)) {
        seen.add(column);
        columns.push(column);
      }
    }
  }
  return columns;
}

function findTimeColumn(rows: Row[], columns: string[]): string | undefined {
  const candidate = columns.find((column) => column.toLowerCase() === TIME_COLUMN_NAME);
  if (candidate === undefined) {
    return undefined;
  }
  return rows.some((row) => isTimestampCell(row[candidate])) ? candidate : undefined;
}

/**
 * Splits the columns of a result into the timestamp, the columns holding measurements and the columns
 * holding dimensions. A column is a dimension as soon as a single one of its values is not a number,
 * which is what keeps series such as `machine`, `repository` or `namespace` from being dropped.
 */
function classifyColumns(rows: Row[]): RowShape {
  const columns = listColumns(rows);
  const timeColumn = findTimeColumn(rows, columns);
  const valueColumns: string[] = [];
  const labelColumns: string[] = [];

  for (const column of columns) {
    if (column === timeColumn) {
      continue;
    }
    if (rows.every((row) => isNumericCell(row[column]))) {
      valueColumns.push(column);
    } else {
      labelColumns.push(column);
    }
  }

  return { timeColumn, valueColumns, labelColumns };
}

function buildLabels(row: Row, labelColumns: string[]): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const column of labelColumns) {
    const value = row[column];
    labels[column] = value === null || value === undefined ? '' : String(value);
  }
  return labels;
}

function buildSeriesName(labels: Record<string, string>, valueColumn: string, includeValueColumn: boolean): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) {
    return valueColumn;
  }

  const base = entries.map(([key, value]) => `${key}=${value}`).join(',');
  return includeValueColumn ? `${base} ${valueColumn}` : base;
}

function toTimestampMs(row: Row, timeColumn: string | undefined, fallbackTimestampMs: number, index: number): number {
  if (timeColumn === undefined) {
    return fallbackTimestampMs + index;
  }
  return new Date(row[timeColumn] as string | number).getTime();
}

/**
 * Pivots a ClickHouse result into Perses time series.
 *
 * Rows are grouped by their dimension columns and every measurement column becomes its own series, so
 * `SELECT time, machine, count() FROM ... GROUP BY time, machine` yields one series per machine instead
 * of a single series with duplicated timestamps.
 *
 * Results without a timestamp are treated as records: each row becomes a series carrying the row's
 * dimensions as labels, which is the shape the Table panel consumes.
 */
function buildTimeSeries(rows: Row[], fallbackTimestampMs: number): TimeSeries[] {
  if (rows.length === 0) {
    return [];
  }

  const { timeColumn, valueColumns, labelColumns } = classifyColumns(rows);
  if (valueColumns.length === 0) {
    return [];
  }

  const groups = new Map<string, Array<{ row: Row; index: number }>>();
  rows.forEach((row, index) => {
    const labels = buildLabels(row, labelColumns);
    const key = labelColumns.map((column) => labels[column]).join('\u0000');
    const group = groups.get(key);
    if (group) {
      group.push({ row, index });
    } else {
      groups.set(key, [{ row, index }]);
    }
  });

  const includeValueColumn = valueColumns.length > 1;
  const series: TimeSeries[] = [];

  for (const entries of groups.values()) {
    const identity = buildLabels(entries[0]!.row, labelColumns);

    for (const valueColumn of valueColumns) {
      const labels: Record<string, string> = { ...identity };
      if (includeValueColumn && !Object.hasOwn(labels, VALUE_COLUMN_LABEL)) {
        labels[VALUE_COLUMN_LABEL] = valueColumn;
      }

      const values: Array<[number, number | null]> = [];
      for (const { row, index } of entries) {
        const timestamp = toTimestampMs(row, timeColumn, fallbackTimestampMs, index);
        if (!Number.isFinite(timestamp)) {
          continue;
        }
        values.push([timestamp, toTimeSeriesValue(row[valueColumn])]);
      }

      if (!values.some(([, value]) => value !== null)) {
        continue;
      }

      series.push({
        name: buildSeriesName(identity, valueColumn, includeValueColumn),
        ...(Object.keys(labels).length > 0 ? { labels } : {}),
        values,
      });
    }
  }

  return series;
}

function inferStepMs(response?: DatasourceQueryResponse): number {
  const data = response?.data;
  if (!Array.isArray(data) || data.length < 2) {
    return DEFAULT_STEP_MS;
  }

  const timestamps = data
    .map((row: TimeSeriesEntry) => (row.time === undefined ? Number.NaN : new Date(row.time).getTime()))
    .filter(Number.isFinite)
    .toSorted((a, b) => a - b);

  if (timestamps.length < 2) {
    return DEFAULT_STEP_MS;
  }

  const deltas: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    const previous = timestamps[i - 1];
    const current = timestamps[i];
    if (previous === undefined || current === undefined || current <= previous) {
      continue;
    }
    deltas.push(current - previous);
  }

  if (deltas.length === 0) {
    return DEFAULT_STEP_MS;
  }

  const deltaCounts = new Map<number, number>();
  for (const delta of deltas) {
    deltaCounts.set(delta, (deltaCounts.get(delta) ?? 0) + 1);
  }

  const inferredStep = Array.from(deltaCounts.entries()).toSorted(([deltaA, countA], [deltaB, countB]) => {
    if (countA !== countB) {
      return countB - countA;
    }
    return deltaB - deltaA;
  })[0]?.[0];

  return inferredStep ?? DEFAULT_STEP_MS;
}

function normalizeRows(response?: DatasourceQueryResponse): Row[] {
  const data = response?.data;
  return Array.isArray(data) ? (data as Row[]) : [];
}

export const getTimeSeriesData: TimeSeriesQueryPlugin<ClickHouseTimeSeriesQuerySpec>['getTimeSeriesData'] = async (
  spec,
  context,
) => {
  if (spec.query === undefined || spec.query === null || spec.query === '') {
    return { series: [] };
  }

  const query = replaceVariables(spec.query, context.variableState);

  const client = (await context.datasourceStore.getDatasourceClient(
    spec.datasource ?? DEFAULT_DATASOURCE,
  )) as ClickHouseClient;

  const { start, end } = context.timeRange;
  const startTime = formatClickHouseDateTime(start);
  const endTime = formatClickHouseDateTime(end);
  const executedQueryString = replaceTimeRangePlaceholders(query, startTime, endTime);

  const response: ClickHouseQueryResponse = await client.query({
    start: startTime,
    end: endTime,
    query: executedQueryString,
  });

  return {
    series: buildTimeSeries(normalizeRows(response), end.getTime()),
    timeRange: { start, end },
    stepMs: inferStepMs(response),
    metadata: {
      executedQueryString,
    },
  };
};
