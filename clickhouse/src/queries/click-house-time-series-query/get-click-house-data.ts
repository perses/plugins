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

import { TimeSeries } from '@perses-dev/core';
import { TimeSeriesQueryPlugin, replaceVariables } from '@perses-dev/plugin-system';
import { DEFAULT_DATASOURCE } from '../constants';
import { TimeSeriesEntry } from '../../model/click-house-data-types';
import {
  ClickHouseClient,
  ClickHouseQueryResponse,
  formatClickHouseDateTime,
  replaceTimeRangePlaceholders,
} from '../../model/click-house-client';
import { ClickHouseTimeSeriesQuerySpec, DatasourceQueryResponse } from './click-house-query-types';

const DEFAULT_STEP_MS = 30 * 1000;

function buildTimeSeries(response?: DatasourceQueryResponse): TimeSeries[] {
  const data = response?.data as TimeSeriesEntry[];
  if (!response || !data || data.length === 0) {
    return [];
  }

  const metricNames = Object.keys(data[0] ?? {}).filter((key) => key !== 'time');

  return metricNames
    .map((metricName) => {
      const values: Array<[number, number | null]> = data.map((row: TimeSeriesEntry) => {
        const timestamp = new Date(row.time).getTime();
        const value = toTimeSeriesValue(row[metricName]);
        return [timestamp, value];
      });

      return {
        name: metricName,
        values,
      };
    })
    .filter((series) => series.values.some(([, value]) => value !== null));
}

function toTimeSeriesValue(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function inferStepMs(response?: DatasourceQueryResponse): number {
  const data = response?.data as TimeSeriesEntry[];
  if (!response || !data || data.length < 2) {
    return DEFAULT_STEP_MS;
  }

  const timestamps = data
    .map((row: TimeSeriesEntry) => new Date(row.time).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  if (timestamps.length < 2) {
    return DEFAULT_STEP_MS;
  }

  const deltas: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    const previous = timestamps[i - 1];
    const current = timestamps[i];
    if (previous === undefined || current === undefined || current <= previous) {
      continue;
    }
    deltas.push(current - previous);
  }

  if (deltas.length === 0) {
    return DEFAULT_STEP_MS;
  }

  const deltaCounts = new Map<number, number>();
  for (const delta of deltas) {
    deltaCounts.set(delta, (deltaCounts.get(delta) ?? 0) + 1);
  }

  const inferredStep = Array.from(deltaCounts.entries()).sort(([deltaA, countA], [deltaB, countB]) => {
    if (countA !== countB) {
      return countB - countA;
    }
    return deltaB - deltaA;
  })[0]?.[0];

  return inferredStep ?? DEFAULT_STEP_MS;
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
  const startTime = formatClickHouseDateTime(start);
  const endTime = formatClickHouseDateTime(end);
  const executedQueryString = replaceTimeRangePlaceholders(query, startTime, endTime);

  const response: ClickHouseQueryResponse = await client.query({
    start: startTime,
    end: endTime,
    query: executedQueryString,
  });

  return {
    series: buildTimeSeries(response),
    timeRange: { start, end },
    stepMs: inferStepMs(response),
    metadata: {
      executedQueryString,
    },
  };
};
