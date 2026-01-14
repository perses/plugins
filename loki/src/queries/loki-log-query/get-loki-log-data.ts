// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the \"License\");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an \"AS IS\" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { replaceVariables } from '@perses-dev/plugin-system';
import { LogEntry, LogData } from '@perses-dev/core';
import { LokiStreamResult } from '../../model/loki-client-types';
import { LokiClient } from '../../model/loki-client';
import { DEFAULT_DATASOURCE } from '../constants';
import { LokiLogQuerySpec, LokiLogQueryResponse } from './loki-log-query-types';
import { LogQueryPlugin, LogQueryContext } from './log-query-plugin-interface';

function convertStreamsToLogs(streams: LokiStreamResult[]): LogData {
  const entries: LogEntry[] = [];

  streams.forEach((stream) => {
    stream.values.forEach(([timestamp, logLine]: [string, string]) => {
      entries.push({
        timestamp: Number(timestamp) / 1000000000,
        line: logLine,
        labels: stream.stream,
      });
    });
  });

  return {
    entries,
    totalCount: entries.length,
  };
}

export const getLokiLogData: LogQueryPlugin<LokiLogQuerySpec>['getLogData'] = async (
  spec: LokiLogQuerySpec,
  context: LogQueryContext
) => {
  if (!spec.query) {
    return {
      logs: { entries: [], totalCount: 0 },
      timeRange: { start: context.timeRange.start, end: context.timeRange.end },
    };
  }

  const query = replaceVariables(spec.query, context.variableState);
  const client = (await context.datasourceStore.getDatasourceClient<LokiClient>(
    spec.datasource ?? DEFAULT_DATASOURCE
  )) as LokiClient;

  const { start, end } = context.timeRange;

  const response: LokiLogQueryResponse = await client.queryRange({
    query,
    start: start.getTime().toString(),
    end: end.getTime().toString(),
    direction: spec.direction,
  });

  if (response.data.resultType === 'streams') {
    const logs = convertStreamsToLogs(response.data.result);
    return {
      logs,
      timeRange: { start, end },
      metadata: {
        executedQueryString: query,
      },
    };
  }

  return {
    logs: { entries: [], totalCount: 0 },
    timeRange: { start, end },
  };
};
