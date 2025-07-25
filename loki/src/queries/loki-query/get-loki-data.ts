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

import { TimeSeries } from '@perses-dev/core';
import { TimeSeriesQueryPlugin, replaceVariables } from '@perses-dev/plugin-system';
import { LokiQueryRangeResponse, LokiStreamResult } from '../../model/loki-client-types';
import { LokiClient } from '../../model/loki-client';
import { LogEntry, LogsData } from '../../model/loki-data-types';
import { LokiQuerySpec } from './loki-query-types';
import { DEFAULT_DATASOURCE } from './constants';

export type LokiMatrixResult = {
  metric: Record<string, string>;
  values: Array<[number, string]>;
};

export type LokiMatrixResponse = {
  resultType: 'matrix';
  result: LokiMatrixResult[];
};

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

function convertMatrixToTimeSeries(matrix: LokiMatrixResult[]): TimeSeries[] {
  return matrix.map((series) => {
    const name = Object.entries(series.metric)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    return {
      name,
      values: series.values.map(([timestamp, value]) => [Number(timestamp), Number(value)]),
      labels: series.metric,
    };
  });
}

export const getLokiData: TimeSeriesQueryPlugin<LokiQuerySpec>['getTimeSeriesData'] = async (spec, context) => {
  if (!spec.query) {
    return { series: [], resultType: 'matrix' };
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
    direction: spec.direction ?? 'backward',
  });

  if (response.data.resultType === 'matrix') {
    return {
      series: convertMatrixToTimeSeries(response.data.result as LokiMatrixResult[]),
      timeRange: { start, end },
      resultType: 'matrix',
      metadata: {
        executedQueryString: query,
      },
    };
  }

  if (response.data.resultType === 'streams') {
    const logs = convertStreamsToLogs(response.data.result as LokiStreamResult[]);
    return {
      series: [],
      timeRange: { start, end },
      logs,
      resultType: 'streams',
      metadata: {
        executedQueryString: query,
      },
    };
  }

  return { series: [], resultType: 'matrix' };
};
