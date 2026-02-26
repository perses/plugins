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

import { replaceVariables } from '@perses-dev/plugin-system';
import { LogEntry, LogData } from '@perses-dev/core';
import { ClickHouseClient, ClickHouseQueryResponse } from '../../model/click-house-client';
import { DEFAULT_DATASOURCE } from '../constants';
import { ClickHouseLogQuerySpec } from './click-house-log-query-types';
import { LogQueryPlugin } from './log-query-plugin-interface';
import { replaceClickHouseBuiltinVariables } from '../replace-click-house-builtin-variables';

function flattenObject(
  obj: Record<string, unknown>,
  parentKey = '',
  result: Record<string, unknown> = {}
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

function convertStreamsToLogs(streams: LogEntry[]): LogData {
  const entries: LogEntry[] = streams.map((entry) => {
    const flattened = flattenObject(entry as unknown as Record<string, unknown>);

    if (!flattened['Timestamp'] && flattened['log_time']) {
      flattened['Timestamp'] = flattened['log_time'];
    }

    const sortedEntry: Record<string, unknown> = {};
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
      timestamp: sortedEntry?.['Timestamp'] as unknown as number,
      labels: sortedEntry as Record<string, string>,
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

  const { start, end } = context.timeRange;

  // Default step for log queries (60 seconds)
  const stepMs = 60 * 1000;

  // Replace built-in variables first, then user-defined variables
  let query = replaceClickHouseBuiltinVariables(spec.query, start, end, stepMs);
  query = replaceVariables(query, context.variableState);

  const client = (await context.datasourceStore.getDatasourceClient(
    spec.datasource ?? DEFAULT_DATASOURCE
  )) as ClickHouseClient;

  const response: ClickHouseQueryResponse = await client.query({
    query,
  });

  return {
    timeRange: { start, end },
    logs: convertStreamsToLogs(response.data as LogEntry[]),
    metadata: {
      executedQueryString: query,
    },
  };
};
