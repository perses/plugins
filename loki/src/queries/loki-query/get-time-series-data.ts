import { TimeSeries } from '@perses-dev/core';
import { TimeSeriesQueryPlugin, replaceVariables } from '@perses-dev/plugin-system';
import { LokiQuerySpec } from './loki-query-types';
import { DEFAULT_DATASOURCE } from './constants';
import { LokiQueryRangeResponse } from '../../model/loki-client-types';
import { LokiClient } from '../../model/loki-client';

export type LokiMatrixResult = {
  metric: Record<string, string>;
  values: [number, string][];
};

export type LokiMatrixResponse = {
  resultType: 'matrix';
  result: LokiMatrixResult[];
};

function convertLokiToMatrix(response: LokiQueryRangeResponse): LokiMatrixResponse {
  if (response.data.resultType === 'matrix') {
    return {
      resultType: 'matrix',
      result: response.data.result as LokiMatrixResult[],
    };
  }
  if (response.data.resultType === 'streams') {
    // Flatten each log line into its own matrix result for table compatibility
    const flatResults: LokiMatrixResult[] = [];
    (response.data.result as any[]).forEach((stream) => {
      stream.values.forEach(([timestamp, logLine]: [string, string]) => {
        flatResults.push({
          metric: stream.stream,
          values: [[Number(timestamp) / 1e9, logLine]],
        });
      });
    });
    return {
      resultType: 'matrix',
      result: flatResults,
    };
  }
  return { resultType: 'matrix', result: [] };
}

function matrixToTimeSeries(matrix: LokiMatrixResponse): TimeSeries[] {
  return matrix.result.map((series) => {
    const name = Object.entries(series.metric)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    return {
      name,
      // For log lines, value will be null (Grafana does this for logs in time series panels)
      values: series.values.map(([timestamp, value]) => [
        Number(timestamp) * 1000,
        isNaN(Number(value)) ? null : Number(value),
      ]),
      // Optionally, add raw log lines for log-aware panels
      logLines: series.values
        .map(([timestamp, value]) => (isNaN(Number(value)) ? { timestamp: Number(timestamp) * 1000, log: value } : undefined))
        .filter(Boolean),
      labels: series.metric,
    };
  });
}

export const getTimeSeriesData: TimeSeriesQueryPlugin<LokiQuerySpec>['getTimeSeriesData'] = async (
  spec,
  context
) => {
  if (spec.query === undefined || spec.query === null || spec.query === '') {
    return { series: [] };
  }

  const query = replaceVariables(spec.query, context.variableState);
  const client = (await context.datasourceStore.getDatasourceClient<LokiClient>(
    spec.datasource ?? DEFAULT_DATASOURCE
  )) as LokiClient;
  const { start, end } = context.timeRange;
  const response: LokiQueryRangeResponse = await client.queryRange({
    query,
    start: start.getTime().toString(),
    end: end.getTime().toString(),
    step: '30',
  });
  const matrix = convertLokiToMatrix(response);
  return {
    series: matrixToTimeSeries(matrix),
    timeRange: { start, end },
    stepMs: 30 * 1000,
    metadata: {
      executedQueryString: query,
    },
  };
};
