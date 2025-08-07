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

import { TimeSeries, DurationString, parseDurationString } from '@perses-dev/core';
import { TimeSeriesQueryPlugin, replaceVariables } from '@perses-dev/plugin-system';
import { milliseconds } from 'date-fns';
import { LokiClient } from '../../model/loki-client';
import { DEFAULT_DATASOURCE } from '../constants';
import { LokiTimeSeriesQuerySpec, LokiTimeSeriesQueryResponse } from './loki-time-series-query-types';

export type LokiMatrixResult = {
  metric: Record<string, string>;
  values: Array<[number, string]>;
};

export type LokiMatrixResponse = {
  resultType: 'matrix';
  result: LokiMatrixResult[];
};

// Constants for Loki step calculation
const MAX_LOKI_DATA_POINTS = 10000; // Similar to Prometheus
const DEFAULT_MIN_STEP_SECONDS = 15; // 15 seconds default minimum

/**
 * Converts a duration string (like "15s", "1m") to seconds
 */
function getDurationStringSeconds(durationString?: DurationString): number | undefined {
  if (!durationString) return undefined;

  const duration = parseDurationString(durationString);
  const ms = milliseconds(duration);
  return Math.floor(ms / 1000);
}

/**
 * Calculates appropriate step for Loki range queries
 */
function getLokiRangeStep(
  startMs: number,
  endMs: number,
  minStepSeconds = DEFAULT_MIN_STEP_SECONDS,
  suggestedStepMs = 0
): number {
  const suggestedStepSeconds = suggestedStepMs / 1000;
  const queryRangeSeconds = (endMs - startMs) / 1000;

  let safeStep = queryRangeSeconds / MAX_LOKI_DATA_POINTS;
  if (safeStep > 1) {
    safeStep = Math.ceil(safeStep);
  }

  return Math.max(suggestedStepSeconds, minStepSeconds, safeStep);
}

/**
 * Formats step in seconds as a duration string for Loki API
 */
function formatStepForLoki(stepSeconds: number): string {
  if (stepSeconds < 60) {
    return `${Math.round(stepSeconds)}s`;
  } else if (stepSeconds < 3600) {
    return `${Math.round(stepSeconds / 60)}m`;
  } else {
    return `${Math.round(stepSeconds / 3600)}h`;
  }
}

function convertMatrixToTimeSeries(matrix: LokiMatrixResult[]): TimeSeries[] {
  return matrix.map((series) => {
    const name = Object.entries(series.metric)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    return {
      name,
      values: series.values.map(([timestamp, value]) => [
        Number(timestamp) * 1000, // Convert seconds to milliseconds
        Number(value),
      ]),
      labels: series.metric,
    };
  });
}

export const getLokiTimeSeriesData: TimeSeriesQueryPlugin<LokiTimeSeriesQuerySpec>['getTimeSeriesData'] = async (
  spec,
  context
) => {
  if (!spec.query) {
    return {
      series: [],
      timeRange: { start: context.timeRange.start, end: context.timeRange.end },
      stepMs: DEFAULT_MIN_STEP_SECONDS * 1000,
    };
  }

  const query = replaceVariables(spec.query, context.variableState);
  const client = (await context.datasourceStore.getDatasourceClient<LokiClient>(
    spec.datasource ?? DEFAULT_DATASOURCE
  )) as LokiClient;

  const { start, end } = context.timeRange;

  // Calculate proper step using similar logic to Prometheus
  const minStepSeconds = spec.step
    ? (getDurationStringSeconds(spec.step as DurationString) ?? DEFAULT_MIN_STEP_SECONDS)
    : DEFAULT_MIN_STEP_SECONDS;
  const stepSeconds = getLokiRangeStep(start.getTime(), end.getTime(), minStepSeconds, context.suggestedStepMs);
  const stepString = formatStepForLoki(stepSeconds);
  const stepMs = stepSeconds * 1000;

  const response: LokiTimeSeriesQueryResponse = await client.queryRange({
    query,
    start: start.getTime().toString(),
    end: end.getTime().toString(),
    step: stepString,
  });

  if (response.data.resultType === 'matrix') {
    const convertedSeries = convertMatrixToTimeSeries(response.data.result as LokiMatrixResult[]);

    return {
      series: convertedSeries,
      timeRange: { start, end },
      stepMs,
      metadata: {
        executedQueryString: query,
      },
    };
  }

  return {
    series: [],
    timeRange: { start, end },
    stepMs,
  };
};
