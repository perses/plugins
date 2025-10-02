import { replaceVariables } from '@perses-dev/plugin-system';
import { VictoriaLogsStreamQueryRangeResponse } from '../../model/types';
import { VictoriaLogsClient } from '../../model/client';
import { LogEntry, LogData } from '@perses-dev/core';
import { DEFAULT_DATASOURCE } from '../constants';
import { VictoriaLogsLogQuerySpec } from './types';
import { LogQueryPlugin, LogQueryContext } from './interface';

function convertStreamToLogs(data: VictoriaLogsStreamQueryRangeResponse, defaultTime: string): LogData {
  const entries: LogEntry[] = [];

  data.forEach((entry) => {
    const { _msg, _time, ...labels } = entry;
    const time = (!_time && !_msg) ? defaultTime : Date.parse(_time);
    entries.push({
      timestamp: Number(time) / 1000,
      line: _msg || "",
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
