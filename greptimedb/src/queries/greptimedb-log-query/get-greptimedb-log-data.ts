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

import { LogData, LogEntry } from '@perses-dev/core';
import { GreptimeDBClient, GreptimeDBQueryResponse } from '../../model/greptimedb-client';
import { DEFAULT_DATASOURCE } from '../constants';
import {
  findTimeColumnIndex,
  GreptimeDBRecords,
  normalizeRecords,
  replaceQueryVariables,
  toTimestampMs,
} from '../greptimedb-query-data-model';
import { GreptimeDBLogQuerySpec } from './greptimedb-log-query-types';
import { LogQueryPlugin } from './log-query-plugin-interface';

function buildLogs(records: GreptimeDBRecords | undefined): LogData {
  const columnSchemas = records?.schema?.column_schemas ?? [];
  const rows = records?.rows ?? [];

  if (!columnSchemas.length || !rows.length) {
    return {
      entries: [],
      totalCount: 0,
    };
  }

  const timeIndex = findTimeColumnIndex(columnSchemas);

  if (timeIndex === -1) {
    return {
      entries: [],
      totalCount: 0,
    };
  }

  const entries = rows
    .map((row) => {
      const tsMs = toTimestampMs(row?.[timeIndex], columnSchemas[timeIndex]?.data_type);
      if (tsMs === null) {
        return null;
      }

      const labels: Record<string, string> = {};
      const lineParts: string[] = [];

      columnSchemas.forEach((col, index) => {
        if (index === timeIndex) {
          return;
        }
        const value = row?.[index];
        const stringValue = value === null || value === undefined ? '' : String(value);
        labels[col.name] = stringValue;
        lineParts.push(`${col.name}=${stringValue === '' ? '--' : stringValue}`);
      });

      return {
        timestamp: Math.floor(tsMs / 1000),
        labels,
        line: lineParts.join(' '),
      } as LogEntry;
    })
    .filter((entry): entry is LogEntry => entry !== null);

  return {
    entries,
    totalCount: entries.length,
  };
}

export const getGreptimeDBLogData: LogQueryPlugin<GreptimeDBLogQuerySpec>['getLogData'] = async (spec, context) => {
  if (!spec.query) {
    return {
      logs: { entries: [], totalCount: 0 },
      timeRange: { start: context.timeRange.start, end: context.timeRange.end },
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

  return {
    timeRange: { start, end },
    logs: buildLogs(records),
    metadata: {
      executedQueryString: query,
    },
  };
};
