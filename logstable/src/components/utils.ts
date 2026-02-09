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

import { Labels, LogEntry } from '@perses-dev/core';

export type Severity = 'critical' | 'error' | 'warning' | 'info' | 'debug' | 'trace' | 'unknown' | 'other';

export const severityAbbreviations: Record<Severity, string[]> = {
  critical: ['critical', 'emerg', 'fatal', 'alert', 'crit'],
  error: ['error', 'err', 'eror'],
  debug: ['debug', 'dbug'],
  info: ['info', 'inf', 'information', 'notice'],
  trace: ['trace'],
  warning: ['warn', 'warning'],
  unknown: ['unknown'],
  other: [''],
};

export const getSeverity = (log: LogEntry): Severity => {
  const level = log.labels?.level?.toLowerCase();

  if (level) {
    for (const [severity, abbreviations] of Object.entries(severityAbbreviations)) {
      if (abbreviations.some((abbr) => abbr && level.includes(abbr))) {
        return severity as Severity;
      }
    }
  }

  return 'unknown';
};

export const convertLogEntriesToLogTableRows = (
  logsEntries: LogEntry[],
  allColumns: string[]
): Array<Record<string, string>> => {
  const records: Array<Record<string, string>> = [];
  logsEntries.forEach((e) => {
    const { timestamp, line, labels } = e;
    const _labels: Labels = { ...labels, timestamp: String(timestamp), line };
    const logTableRow: Record<string, string> = {};
    allColumns.forEach((col) => {
      const cellValue = _labels[col];
      Object.assign(logTableRow, { [col]: cellValue ?? '' });
    });
    records.push(logTableRow);
  });
  return records;
};
