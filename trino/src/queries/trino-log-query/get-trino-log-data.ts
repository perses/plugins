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
import type { LogQueryPlugin } from '@perses-dev/plugin-system';
import { replaceVariables } from '@perses-dev/plugin-system';
import type { LogData, LogEntry, LogMetadata, Notice } from '@perses-dev/spec';

import type { TrinoClient, TrinoRow } from '../../model/trino-client';
import {
  MAX_ROWS,
  formatTrinoDateTime,
  parseTrinoTimestamp,
  replaceTimeRangePlaceholders,
} from '../../model/trino-client';
import { DEFAULT_DATASOURCE } from '../constants';
import { interpolateQueryContext } from '../query-context';
import type { TrinoLogQuerySpec } from './trino-log-query-types';

/** Candidate names for the log time column, in order of preference, matched case-insensitively. */
export const LOG_TIME_COLUMNS = ['timestamp', 'log_time', 'time'];

function flattenObject(
  obj: Record<string, unknown>,
  parentKey = '',
  result: Record<string, unknown> = {},
): Record<string, unknown> {
  for (const [key, value] of Object.entries(obj)) {
    const newKey = parentKey ? `${parentKey}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenObject(value as Record<string, unknown>, newKey, result);
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

function findTimeColumn(row: TrinoRow): string | undefined {
  const keys = Object.keys(row);
  for (const candidate of LOG_TIME_COLUMNS) {
    const key = keys.find((name) => name.toLowerCase() === candidate);
    if (key !== undefined) return key;
  }
  return undefined;
}

function formatValue(value: unknown): string {
  return value === '' || value === null || value === undefined ? '--' : String(value);
}

function convertRowsToLogs(rows: TrinoRow[]): { logs: LogData; skipped: number } {
  const firstRow = rows[0];
  const timeColumn = firstRow && findTimeColumn(firstRow);
  if (!timeColumn) {
    return { logs: { entries: [], totalCount: 0 }, skipped: rows.length };
  }

  const entries: LogEntry[] = [];
  for (const row of rows) {
    const timestampMs = parseTrinoTimestamp(row[timeColumn]);
    if (!Number.isFinite(timestampMs)) continue;

    const flattened = flattenObject(row);
    const keys = Object.keys(flattened).toSorted((a, b) => a.localeCompare(b));
    const labels: Record<string, string> = {};
    for (const key of keys) {
      labels[key] = formatValue(flattened[key]);
    }
    const line = keys
      .filter((key) => key !== timeColumn)
      .map((key) => `<${key}> ${formatValue(flattened[key])}`)
      .join(' ');

    entries.push({ timestamp: timestampMs / 1000, labels, line });
  }

  return { logs: { entries, totalCount: entries.length }, skipped: rows.length - entries.length };
}

export const getTrinoLogData: LogQueryPlugin<TrinoLogQuerySpec>['getLogData'] = async (spec, context, abortSignal) => {
  if (spec.query === undefined || spec.query === null || spec.query === '') {
    return {
      logs: { entries: [], totalCount: 0 },
      timeRange: { start: context.timeRange.start, end: context.timeRange.end },
    };
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

  const { logs, skipped } = convertRowsToLogs(response.data ?? []);
  const notices: Notice[] = [];
  if (response.truncated) {
    notices.push({ type: 'warning', message: `Results were truncated to the first ${MAX_ROWS} rows.` });
  }
  if (skipped > 0) {
    notices.push({
      type: 'warning',
      message: `${skipped} rows were skipped because they have no parseable time column (${LOG_TIME_COLUMNS.join(', ')}).`,
    });
  }

  const metadata = {
    executedQueryString,
    ...(notices.length > 0 && { notices }),
  } satisfies LogMetadata;

  return { timeRange: { start, end }, logs, metadata };
};
