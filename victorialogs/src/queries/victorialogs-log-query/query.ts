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
import { VictoriaLogsStreamQueryRangeResponse } from '../../model/types';
import { VictoriaLogsClient } from '../../model/client';
import { DEFAULT_DATASOURCE } from '../constants';
import { VictoriaLogsLogQuerySpec } from './types';
import { LogQueryPlugin, LogQueryContext } from './interface';

function convertStreamToLogs(data: VictoriaLogsStreamQueryRangeResponse, defaultTime: string): LogData {
  const entries: LogEntry[] = [];

  data.forEach((entry) => {
    const { _msg, _time, ...labels } = entry;
    const time = !_time && !_msg ? defaultTime : Date.parse(_time);
    entries.push({
      timestamp: Number(time) / 1000,
      line: _msg || '',
      labels: labels,
    });
  });

  return {
    entries,
    totalCount: entries.length,
  };
}

export const getVictoriaLogsLogData: LogQueryPlugin<VictoriaLogsLogQuerySpec>['getLogData'] = async (
  spec: VictoriaLogsLogQuerySpec,
  context: LogQueryContext
) => {
  if (!spec.query) {
    return {
      logs: { entries: [], totalCount: 0 },
      timeRange: { start: context.timeRange.start, end: context.timeRange.end },
    };
  }

  const query = replaceVariables(spec.query, context.variableState);
  const client = (await context.datasourceStore.getDatasourceClient<VictoriaLogsClient>(
    spec.datasource ?? DEFAULT_DATASOURCE
  )) as VictoriaLogsClient;

  const { start, end } = context.timeRange;

  const response: VictoriaLogsStreamQueryRangeResponse = await client.streamQueryRange({
    query,
    start: start.toISOString(),
    end: end.toISOString(),
  });

  const logs = convertStreamToLogs(response, end.getTime().toString());

  return {
    logs,
    timeRange: { start, end },
    metadata: {
      executedQueryString: query,
    },
  };
};
