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

import type { Labels, LogData, LogEntry, Notice } from '@perses-dev/spec';

import type { ClickHouseQueryResponse } from '../../model/click-house-client';
import type { ClickHouseColumn } from '../../model/click-house-types';
import { findColumn, getTypeTimeZone, isTimeType } from '../../model/click-house-types';
import { addLabels, toNumber, toText, toUnixMs } from '../../model/values';

/** Names of the column holding the timestamp of a log, by priority, compared case-insensitively. */
export const LOG_TIME_COLUMNS = ['timestamp', 'log_time', 'time'] as const;
/** Names of the column holding the line of a log, by priority, compared case-insensitively. */
export const LOG_BODY_COLUMNS = ['body', 'message', 'msg', 'line', 'log'] as const;
/** Names of the column holding the level of a log, by priority, compared case-insensitively. */
export const LOG_LEVEL_COLUMNS = ['level', 'severitytext', 'severity_text', 'severity'] as const;

const LEVEL_LABEL = 'level';
// Lowest severity number of each level, in the OpenTelemetry log data model.
const SEVERITY_LEVELS: ReadonlyArray<readonly [number, string]> = [
  [21, 'fatal'],
  [17, 'error'],
  [13, 'warn'],
  [9, 'info'],
  [5, 'debug'],
  [1, 'trace'],
];

/** findLogTimeColumn returns the index of the column holding the timestamp of the logs, or -1. */
export function findLogTimeColumn(columns: ClickHouseColumn[]): number {
  const named = findColumn(columns, LOG_TIME_COLUMNS);
  return named !== -1 ? named : columns.findIndex((column) => isTimeType(column.type));
}

function severityLevel(severityNumber: unknown): string | undefined {
  const severity = toNumber(severityNumber);
  if (severity === null) return undefined;
  return SEVERITY_LEVELS.find(([lowest]) => severity >= lowest)?.[1];
}

export interface BuiltLogs {
  logs: LogData;
  notices: Notice[];
}

/**
 * buildLogs converts a result into logs. Each row is a log: its time column is its timestamp, its `Body`
 * (or `message`, `line`...) column is its line, and its other columns are its labels. Objects, such as the
 * attribute maps of OpenTelemetry, add one label per key, named `<column>.<key>`. A log without a line is
 * described by its labels.
 *
 * The `level` label drives the color of a log: it is taken from the `SeverityText` or `SeverityNumber` column when
 * the result has no `level` column.
 */
export function buildLogs(response: ClickHouseQueryResponse): BuiltLogs {
  const { columns, rows, statistics } = response;
  const time = findLogTimeColumn(columns);
  const notices: Notice[] = [];
  if (rows.length > 0 && time === -1) {
    notices.push({
      type: 'warning',
      message: `The query returns no time column: name it ${LOG_TIME_COLUMNS.map((name) => `"${name}"`).join(', ')}, or select a date/time column.`,
    });
    return { logs: { entries: [], totalCount: 0 }, notices };
  }

  const timeZone = getTypeTimeZone(columns[time]?.type ?? '') ?? response.timeZone;
  const body = findColumn(columns, LOG_BODY_COLUMNS);
  const level = findColumn(columns, LOG_LEVEL_COLUMNS);
  const severityNumber = findColumn(columns, ['severitynumber']);
  const entries: LogEntry[] = [];
  let skipped = 0;

  for (const row of rows) {
    const timestampMs = toUnixMs(row[time], timeZone);
    if (Number.isNaN(timestampMs)) {
      skipped++;
      continue;
    }
    const labels: Labels = {};
    for (let index = 0; index < columns.length; index++) {
      if (index !== time && index !== body) addLabels(labels, columns[index]?.name ?? '', row[index]);
    }
    // Empty values, numerous in the OpenTelemetry tables, only add noise to the details of a log.
    for (const name of Object.keys(labels)) {
      if (labels[name] === '') delete labels[name];
    }
    if (labels[LEVEL_LABEL] === undefined) {
      const text = level === -1 ? '' : toText(row[level]);
      const derived = text || severityLevel(row[severityNumber]);
      if (derived) labels[LEVEL_LABEL] = derived;
    }
    const text = body === -1 ? '' : toText(row[body]);
    // A log without a line, such as an OpenTelemetry event, is described by its labels.
    const line =
      text !== ''
        ? text
        : Object.keys(labels)
            .toSorted()
            .map((name) => `<${name}> ${labels[name]}`)
            .join(' ');
    entries.push({ timestamp: timestampMs / 1000, line, labels });
  }

  if (skipped > 0) {
    notices.push({
      type: 'warning',
      message: `${skipped} rows were skipped because their "${columns[time]?.name}" column is not a date/time.`,
    });
  }

  const logs: LogData = { entries, totalCount: entries.length };
  if (response.truncated) logs.hasMore = true;
  if (statistics) {
    logs.metadata = {
      stats: {
        bytesExamined: statistics.bytesRead,
        linesExamined: statistics.rowsRead,
        executionTimeMs: statistics.elapsedMs,
      },
    };
  }
  return { logs, notices };
}
