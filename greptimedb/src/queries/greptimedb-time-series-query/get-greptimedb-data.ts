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

import { TimeSeriesQueryPlugin } from '@perses-dev/plugin-system';
import { GreptimeDBClient, GreptimeDBQueryResponse } from '../../model/greptimedb-client';
import { DEFAULT_DATASOURCE } from '../constants';
import {
  findTimeColumnIndex,
  GreptimeDBRecords,
  normalizeRecords,
  replaceQueryVariables,
  toTimestampMs,
} from '../greptimedb-query-data-model';
import { GreptimeDBTimeSeriesQuerySpec } from './greptimedb-query-types';

function isLikelyNumericType(dataType: string | undefined): boolean {
  if (!dataType) return false;
  const t = dataType.toLowerCase();
  return (
    t.includes('int') || t.includes('float') || t.includes('double') || t.includes('decimal') || t.includes('number')
  );
}

function buildTimeSeries(
  records: GreptimeDBRecords | undefined,
  fallbackTimestampMs: number
): Array<{ name: string; labels: Record<string, string>; values: Array<[number, number]> }> {
  const columnSchemas = records?.schema?.column_schemas ?? [];
  const rows = records?.rows ?? [];

  if (!columnSchemas.length || !rows.length) {
    return [];
  }

  const timeIndex = findTimeColumnIndex(columnSchemas);

  if (timeIndex === -1) {
    // Stat-style queries (e.g. `select count(*)`) may return a single numeric column with no timestamp.
    // In this case, emit a synthetic single-point series to keep numeric panels working.
    const scalarValueIndex = columnSchemas.findIndex((c) => isLikelyNumericType(c.data_type));
    if (scalarValueIndex === -1) {
      return [];
    }

    const scalarColumnName = columnSchemas[scalarValueIndex]?.name ?? 'value';
    const scalarValues: Array<[number, number]> = [];

    rows.forEach((row, rowIndex) => {
      const raw = row?.[scalarValueIndex];
      const value = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(value)) {
        return;
      }
      // Spread multiple rows by 1ms so ordering is stable.
      scalarValues.push([fallbackTimestampMs + rowIndex, value]);
    });

    if (scalarValues.length === 0) {
      return [];
    }

    return [
      {
        name: scalarColumnName,
        labels: {},
        values: scalarValues,
      },
    ];
  }

  // Choose a "value" column. Prefer greptime conventions, then fall back to the first numeric column.
  let valueIndex = columnSchemas.findIndex((c, idx) => idx !== timeIndex && c.name.toLowerCase() === 'greptime_value');
  if (valueIndex === -1) {
    valueIndex = columnSchemas.findIndex((c, idx) => idx !== timeIndex && c.name.toLowerCase() === 'value');
  }
  if (valueIndex === -1) {
    valueIndex = columnSchemas.findIndex((c, idx) => idx !== timeIndex && isLikelyNumericType(c.data_type));
  }
  if (valueIndex === -1) {
    // Last resort: treat the first non-time column as value.
    valueIndex = columnSchemas.findIndex((_, idx) => idx !== timeIndex);
  }

  const valueColumnName = columnSchemas[valueIndex]?.name ?? 'value';

  // Chart-safe default: group rows into standard timeseries (multiple points per series).
  const seriesMap = new Map<
    string,
    { name: string; labels: Record<string, string>; values: Array<[number, number]> }
  >();

  for (const row of rows) {
    const tsMs = toTimestampMs(row?.[timeIndex], columnSchemas[timeIndex]?.data_type);
    if (tsMs === null) {
      continue;
    }

    const raw = row?.[valueIndex];
    const value = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(value)) {
      continue;
    }

    const labels: Record<string, string> = {};
    columnSchemas.forEach((col, idx) => {
      if (idx === timeIndex || idx === valueIndex) return;
      const v = row?.[idx];
      labels[col.name] = v === null || v === undefined ? '' : String(v);
    });

    // Stable series key by label set.
    const labelsKey = columnSchemas
      .filter((_, idx) => idx !== timeIndex && idx !== valueIndex)
      .map((c) => `${c.name}=${labels[c.name] ?? ''}`)
      .join('|');
    const key = `${valueColumnName}|${labelsKey}`;

    const existing = seriesMap.get(key);
    if (existing) {
      existing.values.push([tsMs, value]);
    } else {
      seriesMap.set(key, { name: valueColumnName, labels, values: [[tsMs, value]] });
    }
  }

  return Array.from(seriesMap.values()).filter((s) => s.values.length > 0);
}

function inferStepMsFromSeries(
  series: Array<{ name: string; labels: Record<string, string>; values: Array<[number, number]> }>,
  fallbackStepMs: number
): number {
  let minDeltaMs = Number.POSITIVE_INFINITY;

  for (const s of series) {
    const sortedTimestamps = [...s.values.map(([ts]) => ts)].sort((a, b) => a - b);
    for (let i = 1; i < sortedTimestamps.length; i++) {
      const delta = sortedTimestamps[i]! - sortedTimestamps[i - 1]!;
      if (delta > 0 && delta < minDeltaMs) {
        minDeltaMs = delta;
      }
    }
  }

  return Number.isFinite(minDeltaMs) ? minDeltaMs : fallbackStepMs;
}

export const getTimeSeriesData: TimeSeriesQueryPlugin<GreptimeDBTimeSeriesQuerySpec>['getTimeSeriesData'] = async (
  spec,
  context
) => {
  if (!spec.query) {
    return {
      series: [],
    };
  }

  const { start, end } = context.timeRange;
  const query = replaceQueryVariables(spec.query, context.variableState, context.timeRange);

  const client = (await context.datasourceStore.getDatasourceClient(
    spec.datasource ?? DEFAULT_DATASOURCE
  )) as GreptimeDBClient;

  const response: GreptimeDBQueryResponse = await client.query({
    start: start.getTime().toString(),
    end: end.getTime().toString(),
    query,
  });

  if (response.status === 'error') {
    throw new Error(response.error ?? 'GreptimeDB query failed');
  }

  const records = normalizeRecords(response.data);
  const tableColumns = records?.schema?.column_schemas ?? [];
  const tableRows = records?.rows ?? [];

  const series = buildTimeSeries(records, end.getTime());
  const stepMs = inferStepMsFromSeries(series, context.suggestedStepMs || 30 * 1000);

  return {
    series,
    timeRange: { start, end },
    stepMs,
    metadata: {
      executedQueryString: query,
      records,
      table: {
        columns: tableColumns,
        rows: tableRows,
      },
    },
  };
};
