// Copyright 2025 The Perses Authors
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

import { replaceVariables } from '@perses-dev/plugin-system';
import { LogEntry, LogData } from '@perses-dev/core';
import { ClickHouseClient, ClickHouseQueryResponse } from '../../model/click-house-client';
import { ClickHouseLogQuerySpec } from './click-house-log-query-types';
import { DEFAULT_DATASOURCE } from '../constants';
import { LogQueryPlugin } from './log-query-plugin-interface';

function flattenObject(
  obj: Record<string, any>,
  parentKey = '',
  result: Record<string, any> = {}
): Record<string, any> {
  for (const [key, value] of Object.entries(obj)) {
    const newKey = parentKey ? `${parentKey}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenObject(value, newKey, result);
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

function convertStreamsToLogs(streams: LogEntry[]): LogData {
  const entries: LogEntry[] = streams.map((entry) => {
    const flattened = flattenObject(entry);

    if (!flattened.Timestamp && flattened.log_time) {
      flattened.Timestamp = flattened.log_time;
    }

    const sortedEntry: Record<string, any> = {};
    Object.keys(flattened)
      .sort((a, b) => a.localeCompare(b))
      .forEach((key) => {
        sortedEntry[key] = flattened[key];
      });

    const line = Object.entries(sortedEntry)
      .filter(([key]) => key !== 'Timestamp')
      .map(([key, value]) => `<${key}> ${value === '' || value === null || value === undefined ? '--' : value}`)
      .join(' ');

    return {
      timestamp: sortedEntry?.Timestamp,
      labels: sortedEntry,
      line,
    } as LogEntry;
  });

  return {
    entries,
    totalCount: entries.length,
  };
}

export const getClickHouseLogData: LogQueryPlugin<ClickHouseLogQuerySpec>['getLogData'] = async (spec, context) => {
  if (spec.query === undefined || spec.query === null || spec.query === '') {
    return {
      logs: { entries: [], totalCount: 0 },
      timeRange: { start: context.timeRange.start, end: context.timeRange.end },
    };
  }

  const query = replaceVariables(spec.query, context.variableState);

  const client = (await context.datasourceStore.getDatasourceClient(
    spec.datasource ?? DEFAULT_DATASOURCE
  )) as ClickHouseClient;

  const { start, end } = context.timeRange;

  const response: ClickHouseQueryResponse = await client.query({
    start: start.getTime().toString(),
    end: end.getTime().toString(),
    query,
  });

  return {
    timeRange: { start, end },
    logs: convertStreamsToLogs(response.data),
    metadata: {
      executedQueryString: query,
    },
  };
};
