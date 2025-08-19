import { replaceVariables } from '@perses-dev/plugin-system';
import { LokiStreamResult } from '../../model/loki-client-types';
import { LokiClient } from '../../model/loki-client';
import { LogEntry, LogsData } from '../../model/loki-data-types';
import { DEFAULT_DATASOURCE } from '../constants';
import { LokiLogQuerySpec, LokiLogQueryResponse } from './loki-log-query-types';
import { LogQueryPlugin, LogQueryContext } from './log-query-plugin-interface';

function convertStreamsToLogs(streams: LokiStreamResult[]): LogsData {
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
    direction: 'backward',
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
