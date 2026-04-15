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

import { AbsoluteTimeRange } from '@perses-dev/core';
import { replaceVariables, VariableStateMap } from '@perses-dev/plugin-system';

/**
 * Supplement a variableState map with Perses builtin time-range variables
 * (__from, __to, __range, __range_s, __range_ms).
 *
 * Background: the LogQuery runtime passes context.variableState via
 * useVariableValues() which does NOT include builtin variables, unlike
 * TimeSeriesQuery which uses useAllVariableValues(). This helper bridges
 * that gap so both query types can rely on replaceVariables() uniformly.
 */
export function replaceQueryVariables(
  query: string,
  variableState: VariableStateMap,
  timeRange: AbsoluteTimeRange
): string {
  const { start, end } = timeRange;
  const rangeMs = end.valueOf() - start.valueOf();
  const builtinState: VariableStateMap = {
    __from: { value: start.valueOf().toString(), loading: false },
    __to: { value: end.valueOf().toString(), loading: false },
    __range_ms: { value: rangeMs.toString(), loading: false },
    __range_s: { value: Math.floor(rangeMs / 1000).toString(), loading: false },
    __range: { value: formatDuration(rangeMs), loading: false },
  };
  // User-defined variables take precedence over builtins (matching framework behaviour).
  return replaceVariables(query, { ...builtinState, ...variableState });
}

/** Format a millisecond duration as a human-readable Prometheus-style string, e.g. "1h5m30s". */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  let result = '';
  if (hours > 0) result += `${hours}h`;
  if (minutes > 0) result += `${minutes}m`;
  if (seconds > 0 || result === '') result += `${seconds}s`;
  return result;
}

export interface GreptimeDBColumnSchema {
  name: string;
  data_type?: string;
  semantic_type?: string;
}

export interface GreptimeDBRecords {
  schema?: {
    column_schemas?: GreptimeDBColumnSchema[];
  };
  rows?: unknown[][];
}

function normalizeTimestampType(dataType: string | undefined): string | null {
  if (!dataType) {
    return null;
  }
  return dataType.toLowerCase();
}

export function toTimestampMs(value: unknown, dataType: string | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalizedType = normalizeTimestampType(dataType);

  if (typeof value === 'number') {
    if (normalizedType) {
      if (normalizedType.includes('nanosecond')) {
        return Math.floor(value / 1_000_000);
      }
      if (normalizedType.includes('microsecond')) {
        return Math.floor(value / 1_000);
      }
      if (normalizedType.includes('millisecond')) {
        return value;
      }
      if (normalizedType.includes('second')) {
        return value * 1000;
      }
    }
    if (value > 1_000_000_000_000_000) {
      return Math.floor(value / 1_000_000);
    }
    if (value > 1_000_000_000_000) {
      return value;
    }
    if (value > 1_000_000_000) {
      return value * 1000;
    }
    return value;
  }

  if (typeof value === 'string') {
    const asNumber = Number(value);
    if (!Number.isNaN(asNumber)) {
      return toTimestampMs(asNumber, dataType);
    }
  }

  const asDate = new Date(value as string);
  const ts = asDate.getTime();
  return Number.isNaN(ts) ? null : ts;
}

export function normalizeRecords(payload: unknown): GreptimeDBRecords | undefined {
  if (!payload || typeof payload !== 'object') return undefined;

  // GreptimeDB HTTP API commonly returns: { output: [{ records: {...} }], execution_time_ms }
  const maybeWrapped = payload as { output?: Array<{ records?: GreptimeDBRecords }> };
  const wrappedRecords = maybeWrapped.output?.[0]?.records;
  if (wrappedRecords) return wrappedRecords;

  // Some clients already return the records object directly.
  return payload as GreptimeDBRecords;
}

export function findTimeColumnIndex(columnSchemas: GreptimeDBColumnSchema[]): number {
  let timeIndex = -1;
  const timestampColumns = columnSchemas.filter((col) => {
    const normalizedType = normalizeTimestampType(col.data_type);
    return normalizedType !== null && normalizedType.startsWith('timestamp');
  });
  if (timestampColumns.length > 0) {
    const semanticTimestamp = timestampColumns.find((col) => col.semantic_type?.toLowerCase() === 'timestamp');
    const selectedColumn = semanticTimestamp ?? timestampColumns[0]!;
    timeIndex = columnSchemas.findIndex((col) => col.name === selectedColumn.name);
  }

  if (timeIndex === -1) {
    const fallbackColumns = ['greptime_timestamp', 'timestamp', 'ts', 'time'];
    timeIndex = columnSchemas.findIndex((col) => fallbackColumns.includes(col.name.toLowerCase()));
  }

  return timeIndex;
}
