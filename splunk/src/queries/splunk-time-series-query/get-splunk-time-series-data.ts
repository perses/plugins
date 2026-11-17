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

import type { TimeSeriesQueryPlugin } from '@perses-dev/plugin-system';
import { replaceVariables } from '@perses-dev/plugin-system';
import type { AbsoluteTimeRange, HTTPAllowedEndpoint, TimeSeries, TimeSeriesValueTuple } from '@perses-dev/spec';

import type { SplunkDatasourceSpec } from '../../datasources/splunk-datasource/splunk-datasource-types';
import type { SplunkJobCreateResponse, SplunkJobStatusResponse, SplunkResultsResponse } from '../../model';
import type { SplunkClient } from '../../model/splunk-client';
import { DEFAULT_DATASOURCE } from '../constants';
import type { SplunkTimeSeriesQuerySpec } from './splunk-time-series-query-types';

const DEFAULT_STEP_MS = 60_000;
// Upper bound on chart grid points, protecting against tiny steps inferred from irregular raw events.
const MAX_GRID_POINTS = 10_000;

export function convertResultsToTimeSeries(
  results: Array<{ _time: string; [key: string]: string | number }> | { _time: string; [key: string]: string | number },
): TimeSeries[] {
  // Perses expects values sorted by ascending time, while raw Splunk searches return newest first.
  const resultsArray = (Array.isArray(results) ? results : [results]).toSorted(
    (a, b) => new Date(a._time).getTime() - new Date(b._time).getTime(),
  );

  if (resultsArray.length === 0) return [];

  const firstResult = resultsArray[0];
  if (!firstResult) return [];

  const metricKeys = Object.keys(firstResult).filter((key) => key !== '_time');

  return metricKeys.map((metricKey) => ({
    name: metricKey,
    values: resultsArray.map((result) => {
      const timestamp = new Date(result._time).getTime();
      const value = Number(result[metricKey]) || 0;
      return [timestamp, value];
    }),
    labels: { metric: metricKey },
  }));
}

/**
 * Greatest common divisor (Euclidean algorithm). Used to find the largest step that evenly divides every gap
 * between consecutive timestamps (e.g. gaps of 1h and 2h give a 1h step), so all points fall on the chart grid
 * even when some buckets are missing.
 */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function getGridSlot(timestamp: number, startMs: number, stepMs: number): number {
  return startMs + Math.ceil((timestamp - startMs) / stepMs) * stepMs;
}

/**
 * Perses charts re-grid series values from `timeRange.start` using `stepMs`, so both must match the
 * actual Splunk buckets (e.g. timechart span) rather than the panel-width-dependent suggested step.
 * The grid is anchored on the data, so when mixed with other queries in the same panel, it only lines up with
 * their grids if the Splunk buckets share the same alignment (e.g. timezone for day spans).
 */
export function getTimeScaleForSeries(
  series: TimeSeries[],
  requestedRange: AbsoluteTimeRange,
  fallbackStepMs: number,
): { timeRange: AbsoluteTimeRange; stepMs: number } {
  const timestamps = [
    ...new Set(series.flatMap(({ values }) => values.map(([timestamp]) => timestamp).filter(Number.isFinite))),
  ].toSorted((a, b) => a - b);
  const firstTimestamp = timestamps[0];
  const lastTimestamp = timestamps[timestamps.length - 1];
  if (firstTimestamp === undefined || lastTimestamp === undefined) {
    return { timeRange: requestedRange, stepMs: fallbackStepMs };
  }

  let stepMs = 0;
  for (let i = 1; i < timestamps.length; i++) {
    stepMs = gcd(stepMs, Math.round((timestamps[i] as number) - (timestamps[i - 1] as number)));
  }
  if (stepMs <= 0) {
    stepMs = fallbackStepMs;
  }

  const requestedStartMs = requestedRange.start.getTime();
  const requestedEndMs = requestedRange.end.getTime();
  const rangeMs = Math.max(requestedEndMs, lastTimestamp) - Math.min(requestedStartMs, firstTimestamp);
  stepMs = Math.max(stepMs, Math.ceil(rangeMs / MAX_GRID_POINTS));

  // Align the grid start on the data so that, unless the step was capped, every point lands at its real timestamp.
  const startMs = firstTimestamp - Math.max(0, Math.ceil((firstTimestamp - requestedStartMs) / stepMs)) * stepMs;
  const endMs = Math.max(requestedEndMs, getGridSlot(lastTimestamp, startMs, stepMs));

  return { timeRange: { start: new Date(startMs), end: new Date(endMs) }, stepMs };
}

/**
 * Perses charts expect at most one value per grid slot, each exactly on the grid: an off-grid or duplicate value is
 * placed in the next free slot, shifting every following point. Like a Prometheus range query, each slot takes the
 * latest value at or before its timestamp. Values with an invalid timestamp are dropped.
 */
export function alignSeriesOnTimeScale(
  series: TimeSeries[],
  { timeRange, stepMs }: { timeRange: AbsoluteTimeRange; stepMs: number },
): TimeSeries[] {
  const startMs = timeRange.start.getTime();
  return series.map((timeSeries) => {
    const valuesBySlot = new Map<number, TimeSeriesValueTuple[1]>();
    for (const [timestamp, value] of timeSeries.values) {
      if (Number.isFinite(timestamp)) {
        valuesBySlot.set(getGridSlot(timestamp, startMs, stepMs), value);
      }
    }
    return { ...timeSeries, values: [...valuesBySlot] };
  });
}

export const getSplunkTimeSeriesData: TimeSeriesQueryPlugin<SplunkTimeSeriesQuerySpec>['getTimeSeriesData'] = async (
  spec,
  context,
) => {
  if (!spec.query) {
    return {
      series: [],
      timeRange: { start: context.timeRange.start, end: context.timeRange.end },
      stepMs: DEFAULT_STEP_MS,
    };
  }

  const query = replaceVariables(spec.query, context.variableState);
  const client: SplunkClient = await context.datasourceStore.getDatasourceClient<SplunkClient>(
    spec.datasource ?? DEFAULT_DATASOURCE,
  );

  const datasourceSpec = await context.datasourceStore.getDatasource(spec.datasource ?? DEFAULT_DATASOURCE);
  const allowedEndpoints: HTTPAllowedEndpoint[] =
    (datasourceSpec.plugin.spec as SplunkDatasourceSpec)?.proxy?.spec?.allowedEndpoints || [];

  const hasExportEndpoint = allowedEndpoints.some((ep: HTTPAllowedEndpoint) => ep.endpointPattern?.includes('/export'));

  const { start, end } = context.timeRange;

  const earliest_time = Math.floor(start.getTime() / 1000).toString();
  const latest_time = Math.floor(end.getTime() / 1000).toString();

  let resultsResponse: SplunkResultsResponse;

  if (hasExportEndpoint) {
    resultsResponse = await client.exportSearch({
      search: query,
      earliest_time: spec.earliest || earliest_time,
      latest_time: spec.latest || latest_time,
    });
  } else {
    const jobResponse: SplunkJobCreateResponse = await client.createJob({
      search: query,
      earliest_time: spec.earliest || earliest_time,
      latest_time: spec.latest || latest_time,
    });

    const jobId: string = jobResponse.sid;

    let jobStatus: SplunkJobStatusResponse;
    do {
      await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 500ms between polls
      jobStatus = await client.getJobStatus(jobId);
      if (!jobStatus || !jobStatus.entry?.[0]?.content) {
        console.warn('Failed to get job status or job status response is malformed', { jobStatus });
        break;
      }
    } while (!jobStatus.entry?.[0]?.content?.isDone);

    resultsResponse = await client.getJobResults(jobId);
  }

  const convertedSeries: TimeSeries[] = convertResultsToTimeSeries(
    resultsResponse.results as Array<{ _time: string; [key: string]: string | number }>,
  );

  const timeScale = getTimeScaleForSeries(convertedSeries, { start, end }, context.suggestedStepMs || DEFAULT_STEP_MS);

  return {
    series: alignSeriesOnTimeScale(convertedSeries, timeScale),
    ...timeScale,
    metadata: {
      executedQueryString: query,
    },
  };
};
