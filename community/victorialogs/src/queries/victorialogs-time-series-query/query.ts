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
import { VictoriaLogsClient } from '../../model/client';
import { VictoriaLogsStatsQueryRangeResponse } from '../../model/types';
import { DEFAULT_DATASOURCE } from '../constants';
import { VictoriaLogsTimeSeriesQuerySpec } from './types';

export type VictoriaLogsMatrixResult = {
  metric: Record<string, string>;
  values: Array<[number, string]>;
};

export type VictoriaLogsMatrixResponse = {
  resultType: 'matrix';
  result: VictoriaLogsMatrixResult[];
};

// Constants for VictoriaLogs step calculation
const MAX_VICTORIALOGS_DATA_POINTS = 10000; // Similar to Prometheus
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
 * Calculates appropriate step for VictoriaLogs range queries
 */
function getVictoriaLogsRangeStep(
  startMs: number,
  endMs: number,
  minStepSeconds = DEFAULT_MIN_STEP_SECONDS,
  suggestedStepMs = 0
): number {
  const suggestedStepSeconds = suggestedStepMs / 1000;
  const querySeconds = (endMs - startMs) / 1000;

  let safeStep = querySeconds / MAX_VICTORIALOGS_DATA_POINTS;
  if (safeStep > 1) {
    safeStep = Math.ceil(safeStep);
  }

  return Math.max(suggestedStepSeconds, minStepSeconds, safeStep);
}

/**
 * Formats step in seconds as a duration string for VictoriaLogs API
 */
function formatStepForVictoriaLogs(stepSeconds: number): string {
  if (stepSeconds < 60) {
    return `${Math.round(stepSeconds)}s`;
  } else if (stepSeconds < 3600) {
    return `${Math.round(stepSeconds / 60)}m`;
  } else {
    return `${Math.round(stepSeconds / 3600)}h`;
  }
}

function convertMatrixToTimeSeries(matrix: VictoriaLogsMatrixResult[]): TimeSeries[] {
  return matrix.map((series) => {
    const { _stream, ...labels } = series.metric;
    if (_stream) {
      const match = _stream.match(/{([^}]+)}/);
      if (match && match[1]) {
        const labelsStr = match[1].split(',').forEach(labelPair => {
          const [key, val] = labelPair.split('=').map(s => s.trim().replace(/^"|"$/g, ''));
          if (key && val) labels[key] = val;
        });
      }
    }
    const name = Object.entries(labels)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    return {
      name: name,
      values: series.values.map(([timestamp, value]) => [
        Number(timestamp) * 1000, // Convert seconds to milliseconds
        Number(value),
      ]),
      labels,
    };
  });
}

export const getVictoriaLogsTimeSeriesData: TimeSeriesQueryPlugin<VictoriaLogsTimeSeriesQuerySpec>['getTimeSeriesData'] = async (
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
  const client = (await context.datasourceStore.getDatasourceClient<VictoriaLogsClient>(
    spec.datasource ?? DEFAULT_DATASOURCE
  )) as VictoriaLogsClient;

  const { start, end } = context.timeRange;

  const minStepSeconds = spec.step
    ? (getDurationStringSeconds(spec.step as DurationString) ?? DEFAULT_MIN_STEP_SECONDS)
    : DEFAULT_MIN_STEP_SECONDS;
  const stepSeconds = getVictoriaLogsRangeStep(start.getTime(), end.getTime(), minStepSeconds, context.suggestedStepMs);
  const stepString = formatStepForVictoriaLogs(stepSeconds);
  const stepMs = stepSeconds * 1000;

  const response: VictoriaLogsStatsQueryRangeResponse = await client.statsQueryRange({
    query,
    step: stepString,
    start: start.toISOString(),
    end: end.toISOString(),
  });

  if (response.status === 'error') {
    throw new Error(response.error)
  }

  const series = convertMatrixToTimeSeries(response.data.result as VictoriaLogsMatrixResult[]);

  return {
    series: series,
    timeRange: { start, end },
    stepMs,
    metadata: {
      executedQueryString: query,
    },
  };
};
