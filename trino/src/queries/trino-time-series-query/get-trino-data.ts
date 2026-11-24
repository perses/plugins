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
import type { Notice, TimeSeries } from '@perses-dev/spec';

import type { TrinoClient, TrinoColumn, TrinoRow } from '../../model/trino-client';
import {
  MAX_ROWS,
  formatTrinoDateTime,
  parseTrinoTimestamp,
  replaceTimeRangePlaceholders,
} from '../../model/trino-client';
import { DEFAULT_DATASOURCE } from '../constants';
import { interpolateQueryContext } from '../query-context';
import type { TrinoTimeSeriesQuerySpec } from './trino-query-types';

const DEFAULT_STEP_MS = 30 * 1000;
const TIME_COLUMN = 'time';

interface TimedRow {
  timestamp: number;
  row: TrinoRow;
}

function toTimedRows(rows: TrinoRow[]): TimedRow[] {
  return rows
    .map((row) => ({ timestamp: parseTrinoTimestamp(row[TIME_COLUMN]), row }))
    .filter(({ timestamp }) => Number.isFinite(timestamp));
}

// Booleans stay values (plotted as 0/1), as before label columns existed.
const VALUE_TYPE = /^(tinyint|smallint|integer|bigint|real|double|decimal|number|boolean)\b/;
export const MAX_SERIES = 1000;

interface SeriesGroup {
  key: string;
  labels: Record<string, string>;
  selector: string;
  rows: TimedRow[];
}

function labelValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

// classifyColumns splits the non-time columns into value and label columns by their Trino type.
function classifyColumns(
  firstRow: TrinoRow,
  columns: TrinoColumn[] | undefined,
): { valueColumns: string[]; labelColumns: string[] } {
  const valueColumns: string[] = [];
  const labelColumns: string[] = [];
  const typed = (columns ?? []).filter(({ name }) => name !== TIME_COLUMN);
  if (typed.length === 0) {
    return { valueColumns: Object.keys(firstRow).filter((key) => key !== TIME_COLUMN), labelColumns };
  }
  for (const { name, type } of typed) {
    (VALUE_TYPE.test(type) ? valueColumns : labelColumns).push(name);
  }
  return { valueColumns, labelColumns };
}

// groupByLabels groups rows by their label values, sorted by key so the series order is stable across refreshes.
function groupByLabels(rows: TimedRow[], labelColumns: string[]): SeriesGroup[] {
  if (labelColumns.length === 0) {
    return [{ key: '', labels: {}, selector: '', rows }];
  }
  const groups = new Map<string, SeriesGroup>();
  for (const timedRow of rows) {
    // The key keeps null apart from '': merged, two rows at the same time would land in one series.
    const key = JSON.stringify(labelColumns.map((name) => timedRow.row[name] ?? null));
    let group = groups.get(key);
    if (group === undefined) {
      // A null label is left out, so its series doesn't look like the '' one.
      const present = labelColumns.filter((name) => (timedRow.row[name] ?? null) !== null);
      const labels = Object.fromEntries(present.map((name) => [name, labelValue(timedRow.row[name])]));
      const selector = `{${present.map((name) => `${name}=${JSON.stringify(labels[name])}`).join(', ')}}`;
      group = { key, labels, selector, rows: [] };
      groups.set(key, group);
    }
    group.rows.push(timedRow);
  }
  return Array.from(groups.values()).toSorted((a, b) => (a.key < b.key ? -1 : Number(a.key > b.key)));
}

function buildTimeSeries(rows: TimedRow[], valueColumns: string[], labelColumns: string[]): TimeSeries[] {
  const groups = groupByLabels(rows, labelColumns);
  const multipleValueColumns = valueColumns.length > 1;
  return valueColumns.flatMap((valueColumn) =>
    groups.flatMap(({ labels, selector, rows: groupRows }): TimeSeries[] => {
      let hasValue = false;
      const values = groupRows.map(({ timestamp, row }): [number, number | null] => {
        const value = toTimeSeriesValue(row[valueColumn]);
        hasValue ||= value !== null;
        return [timestamp, value];
      });
      if (!hasValue) return [];
      if (labelColumns.length === 0) return [{ name: valueColumn, values }];
      return [
        multipleValueColumns
          ? { name: `${valueColumn}${selector}`, labels: { __name__: valueColumn, ...labels }, values }
          : { name: selector, labels: { ...labels }, values },
      ];
    }),
  );
}

function toTimeSeriesValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function inferStepMs(rows: TimedRow[]): number {
  const timestamps = rows.map(({ timestamp }) => timestamp).toSorted((a, b) => a - b);

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

export const getTimeSeriesData: TimeSeriesQueryPlugin<TrinoTimeSeriesQuerySpec>['getTimeSeriesData'] = async (
  spec,
  context,
  abortSignal,
) => {
  if (spec.query === undefined || spec.query === null || spec.query === '') {
    return { series: [] };
  }

  const query = replaceVariables(spec.query, context.variableState);

  const client = (await context.datasourceStore.getDatasourceClient(
    spec.datasource ?? DEFAULT_DATASOURCE,
  )) as TrinoClient;

  const { start, end } = context.timeRange;
  const startTime = formatTrinoDateTime(start);
  const endTime = formatTrinoDateTime(end);
  const executedQueryString = replaceTimeRangePlaceholders(query, startTime, endTime);

  const response = await client.query({
    start: startTime,
    end: endTime,
    query: executedQueryString,
    ...interpolateQueryContext(spec, context.variableState),
    signal: abortSignal,
  });

  const rows = toTimedRows(response.data ?? []);
  const notices: Notice[] = [];
  if (response.truncated) {
    notices.push({ type: 'warning', message: `Results were truncated to the first ${MAX_ROWS} rows.` });
  }
  if (rows.length < (response.data?.length ?? 0)) {
    notices.push({
      type: 'warning',
      message: `Rows without a parseable "${TIME_COLUMN}" column were skipped.`,
    });
  }

  const firstRow = rows[0]?.row;
  const { valueColumns, labelColumns } = classifyColumns(firstRow ?? {}, response.columns);
  let series = firstRow ? buildTimeSeries(rows, valueColumns, labelColumns) : [];
  if (firstRow && (response.columns?.length ?? 0) > 0 && valueColumns.length === 0) {
    notices.push({
      type: 'warning',
      message: 'No numeric columns: cast value columns to a number type such as double.',
    });
  }
  if (series.length > MAX_SERIES) {
    notices.push({
      type: 'warning',
      message: `Results were split into ${series.length} series; only the first ${MAX_SERIES} are shown. Drop high-cardinality label columns or cast them to a number.`,
    });
    series = series.slice(0, MAX_SERIES);
  }

  return {
    series,
    timeRange: { start, end },
    stepMs: inferStepMs(rows),
    metadata: {
      executedQueryString,
      ...(notices.length > 0 && { notices }),
    },
  };
};
