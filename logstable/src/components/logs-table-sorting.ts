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

import { LogEntry } from '@perses-dev/spec';
import { LogsColumnSortMode, SortDirection } from '../model';

export type { SortDirection, LogsColumnSortMode };

export interface SortState {
  columnName: string;
  direction: SortDirection;
  mode: LogsColumnSortMode;
}

/**
 * Extracts the raw value for a column from a log entry.
 */
function getRawValue(log: LogEntry, columnName: string): string | number | undefined {
  if (columnName === 'timestamp') return log.timestamp;
  if (columnName === 'line') return log.line;
  return log.labels[columnName];
}

/**
 * Compares two log entries by the specified column and sort configuration.
 */
export function compareLogsByColumn(a: LogEntry, b: LogEntry, sort: SortState): number {
  const valA = getRawValue(a, sort.columnName);
  const valB = getRawValue(b, sort.columnName);
  const directionMultiplier = sort.direction === 'asc' ? 1 : -1;

  let result: number;

  switch (sort.mode) {
    case 'timestamp': {
      const numA = typeof valA === 'number' ? valA : Number(valA);
      const numB = typeof valB === 'number' ? valB : Number(valB);
      result = numA - numB;
      break;
    }
    case 'numeric': {
      const numA = parseFloat(String(valA ?? ''));
      const numB = parseFloat(String(valB ?? ''));
      const aIsNaN = isNaN(numA);
      const bIsNaN = isNaN(numB);
      if (aIsNaN && bIsNaN) return 0;
      if (aIsNaN) return 1; // NaN sorts last regardless of direction
      if (bIsNaN) return -1;
      result = numA - numB;
      break;
    }
    case 'alphabetical':
    default: {
      const strA = valA !== undefined ? String(valA) : undefined;
      const strB = valB !== undefined ? String(valB) : undefined;
      if (strA === undefined && strB === undefined) return 0;
      if (strA === undefined) return 1; // undefined sorts last regardless of direction
      if (strB === undefined) return -1;
      result = strA.localeCompare(strB);
      break;
    }
  }

  return result * directionMultiplier;
}
