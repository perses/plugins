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

import type { TrinoClient, TrinoQueryResponse, TrinoRow } from '../../model/trino-client';
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

const NUMERIC_TYPE = /^(tinyint|smallint|integer|bigint|real|double|decimal|number)\b/;

function labelValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

// lacksNumericColumns is true when column types are known and none of the non-time columns is a number.
function lacksNumericColumns(columns: TrinoQueryResponse['columns']): boolean {
  if (!columns?.length) return false;
  return !columns.some(({ name, type }) => name !== TIME_COLUMN && NUMERIC_TYPE.test(type));
}

function seriesName(valueColumn: string, labels: Record<string, string>, multipleValueColumns: boolean): string {
  const labelNames = Object.keys(labels);
  if (labelNames.length === 0) {
    return valueColumn;
  }
  const selector = `{${labelNames.map((name) => `${name}=${JSON.stringify(labels[name])}`).join(', ')}}`;
  return multipleValueColumns ? `${valueColumn}${selector}` : selector;
}

function buildTimeSeries(rows: TimedRow[], columns: TrinoQueryResponse['columns']): TimeSeries[] {
  const firstRow = rows[0]?.row;
  if (!firstRow) {
    return [];
  }

  const typed = (columns ?? []).filter(({ name }) => name !== TIME_COLUMN);
  const hasTypes = typed.length > 0;
  const valueColumns = hasTypes
    ? typed.filter(({ type }) => NUMERIC_TYPE.test(type)).map(({ name }) => name)
    : Object.keys(firstRow).filter((key) => key !== TIME_COLUMN);
  const labelColumns = hasTypes ? typed.filter(({ type }) => !NUMERIC_TYPE.test(type)).map(({ name }) => name) : [];

  const groups = new Map<string, { labels: Record<string, string>; rows: TimedRow[] }>();
  for (const timedRow of rows) {
    const labels = Object.fromEntries(labelColumns.map((name) => [name, labelValue(timedRow.row[name])]));
    // The key keeps null apart from '' so the two never share a series.
    const key = JSON.stringify(labelColumns.map((name) => timedRow.row[name] ?? null));
    const group = groups.get(key) ?? { labels, rows: [] };
    group.rows.push(timedRow);
    groups.set(key, group);
  }

  return valueColumns
    .flatMap((valueColumn) =>
      Array.from(groups.values()).map((group): TimeSeries => {
        const series: TimeSeries = {
          name: seriesName(valueColumn, group.labels, valueColumns.length > 1),
          values: group.rows.map(({ timestamp, row }): [number, number | null] => [
            timestamp,
            toTimeSeriesValue(row[valueColumn]),
          ]),
        };
        if (labelColumns.length > 0) {
          series.labels = group.labels;
        }
        return series;
      }),
    )
    .filter((series) => series.values.some(([, value]) => value !== null));
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

  const series = buildTimeSeries(rows, response.columns);
  if (rows.length > 0 && lacksNumericColumns(response.columns)) {
    notices.push({
      type: 'warning',
      message: 'No numeric columns: cast value columns to a number type such as double.',
    });
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
