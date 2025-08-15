import { TimeSeries } from '@perses-dev/core';
import { TimeSeriesQueryPlugin, replaceVariables } from '@perses-dev/plugin-system';
import { ClickHouseTimeSeriesQuerySpec, DatasourceQueryResponse } from './click-house-query-types';
import { DEFAULT_DATASOURCE } from './constants';
import { LogEntry, LogsData, TimeSeriesEntry } from '../../model/click-house-data-types';
import { ClickHouseClient, ClickHouseQueryResponse } from '../../model/click-house-client';

function buildTimeSeries(response?: DatasourceQueryResponse): TimeSeries[] {
  if (!response || !response.data || response.data.length === 0) {
    return [];
  }

  const values: Array<[number, number]> = response.data.map((row: TimeSeriesEntry) => {
    const timestamp = new Date(row.time).getTime();
    const value = Number(row.log_count);
    return [timestamp, value];
  });

  return [
    {
      name: 'log_count',
      values,
    },
  ];
}

function convertStreamsToLogs(streams: LogEntry[]): LogsData {
  const entries: LogEntry[] = streams.map((entry) => ({
    Body: entry.Body,
    LogAttributes: entry.LogAttributes,
    ResourceAttributes: entry.ResourceAttributes,
    ScopeAttributes: entry.ScopeAttributes,
    ScopeName: entry.ScopeName,
    ScopeVersion: entry.ScopeVersion,
    ScopeSchemaUrl: entry.ScopeSchemaUrl,
    ServiceName: entry.ServiceName,
    SeverityNumber: entry.SeverityNumber,
    SeverityText: entry.SeverityText,
    SpanId: entry.SpanId,
    Timestamp: entry.Timestamp ?? entry.log_time,
    TraceFlags: entry.TraceFlags,
    TraceId: entry.TraceId,
  }));

  return {
    entries,
    totalCount: entries.length,
  };
}

export const getTimeSeriesData: TimeSeriesQueryPlugin<ClickHouseTimeSeriesQuerySpec>['getTimeSeriesData'] = async (
  spec,
  context
) => {
  if (spec.query === undefined || spec.query === null || spec.query === '') {
    return { series: [] };
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
    series: buildTimeSeries(response),
    timeRange: { start, end },
    stepMs: 30 * 1000,
    logs: convertStreamsToLogs(response.data),
    metadata: {
      executedQueryString: query,
    },
  };
};
