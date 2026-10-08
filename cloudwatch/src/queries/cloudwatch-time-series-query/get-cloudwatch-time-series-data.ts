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

import type { TimeSeriesQueryPlugin, VariableStateMap } from '@perses-dev/plugin-system';
import { parseVariables, replaceVariables } from '@perses-dev/plugin-system';
import type { TimeSeries } from '@perses-dev/spec';

import type { CloudWatchClient, CloudWatchDimensions, CloudWatchMetricDataQuery } from '../../model';
import { CLOUDWATCH_MIN_PERIOD, DEFAULT_CLOUDWATCH, getEffectivePeriod } from '../../model';
import type { CloudWatchTimeSeriesQuerySpec } from './cloudwatch-time-series-query-types';

function replaceDimensions(
  dimensions: CloudWatchDimensions | undefined,
  variables: VariableStateMap,
): CloudWatchDimensions | undefined {
  if (dimensions === undefined) {
    return undefined;
  }
  return Object.fromEntries(
    Object.entries(dimensions).map(([name, value]) => [
      replaceVariables(name, variables),
      replaceVariables(value, variables),
    ]),
  );
}

/**
 * Replaces the variables of a query and adapts its period to the time range.
 */
export function resolveQuery(
  query: CloudWatchMetricDataQuery,
  variables: VariableStateMap,
  rangeSeconds: number,
  returnedSeries: number,
  suggestedStepMs?: number,
): CloudWatchMetricDataQuery {
  const resolved: CloudWatchMetricDataQuery = { ...query };
  if (query.label !== undefined) {
    resolved.label = replaceVariables(query.label, variables);
  }
  if (query.expression !== undefined) {
    resolved.expression = replaceVariables(query.expression, variables);
  }
  if (query.metric !== undefined) {
    resolved.metric = {
      ...query.metric,
      namespace: replaceVariables(query.metric.namespace, variables),
      name: replaceVariables(query.metric.name, variables),
      dimensions: replaceDimensions(query.metric.dimensions, variables),
      period: getEffectivePeriod(query.metric.period, rangeSeconds, returnedSeries, suggestedStepMs),
    };
  }
  return resolved;
}

/**
 * Returns the names of the variables used by the queries.
 */
export function getQueryVariables(spec: CloudWatchTimeSeriesQuerySpec): string[] {
  const texts = spec.queries.flatMap((query) => [
    query.label ?? '',
    query.expression ?? '',
    query.metric?.namespace ?? '',
    query.metric?.name ?? '',
    ...Object.entries(query.metric?.dimensions ?? {}).flat(),
  ]);
  return [...new Set(texts.flatMap((text) => parseVariables(text)))];
}

export const getCloudWatchTimeSeriesData: TimeSeriesQueryPlugin<CloudWatchTimeSeriesQuerySpec>['getTimeSeriesData'] =
  async (spec, context, abortSignal) => {
    const { start, end } = context.timeRange;
    if (spec.queries.length === 0) {
      return { series: [], timeRange: { start, end }, stepMs: CLOUDWATCH_MIN_PERIOD * 1000 };
    }

    const rangeSeconds = (end.getTime() - start.getTime()) / 1000;
    const returnedSeries = spec.queries.filter((query) => query.returnData !== false).length;
    const queries = spec.queries.map((query) =>
      resolveQuery(query, context.variableState, rangeSeconds, returnedSeries, context.suggestedStepMs),
    );

    const client = await context.datasourceStore.getDatasourceClient<CloudWatchClient>(
      spec.datasource ?? DEFAULT_CLOUDWATCH,
    );
    const response = await client.getMetricData(
      { startTime: start.toISOString(), endTime: end.toISOString(), queries },
      abortSignal,
    );

    const series: TimeSeries[] = response.MetricDataResults.map((result) => ({
      name: result.Label || result.Id,
      values: result.Timestamps.map((timestamp, index) => [timestamp, result.Values[index] ?? null]),
    }));
    const periods = queries.flatMap((query) => (query.metric ? [query.metric.period] : []));
    const stepSeconds = periods.length > 0 ? Math.min(...periods) : CLOUDWATCH_MIN_PERIOD;

    return { series, timeRange: { start, end }, stepMs: stepSeconds * 1000 };
  };
