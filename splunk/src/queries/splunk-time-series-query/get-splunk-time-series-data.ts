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
import { SplunkClient } from '../../model/splunk-client';
import { DEFAULT_DATASOURCE } from '../constants';
import { SplunkTimeSeriesQuerySpec } from './splunk-time-series-query-types';
import { SplunkJobCreateResponse, SplunkJobStatusResponse, SplunkResultsResponse } from '../../model';

function convertResultsToTimeSeries(
  results: Array<{ _time: string;[key: string]: string | number }> | { _time: string;[key: string]: string | number }
): TimeSeries[] {
  const resultsArray = Array.isArray(results) ? results : [results];

  if (resultsArray.length === 0) return [];

  const firstResult = resultsArray[0];
  if (!firstResult) return [];

  const metricKeys = Object.keys(firstResult).filter((key) => key !== '_time');

  return metricKeys.map((metricKey) => ({
    name: metricKey,
    values: resultsArray.map((result) => {
      const timestamp = new Date(result._time).getTime() / 1000;
      const value = Number(result[metricKey]) || 0;
      return [timestamp, value];
    }),
    labels: { metric: metricKey },
  }));
}

export const getSplunkTimeSeriesData: TimeSeriesQueryPlugin<SplunkTimeSeriesQuerySpec>['getTimeSeriesData'] = async (
  spec,
  context
) => {
  if (!spec.query) {
    return {
      series: [],
      timeRange: { start: context.timeRange.start, end: context.timeRange.end },
      stepMs: 60000, // Default 1 minute
    };
  }

  const query = replaceVariables(spec.query, context.variableState);
  const client: SplunkClient = (await context.datasourceStore.getDatasourceClient<SplunkClient>(
    spec.datasource ?? DEFAULT_DATASOURCE
  )) as SplunkClient;

  const datasourceSpec = await context.datasourceStore.getDatasource(spec.datasource ?? DEFAULT_DATASOURCE);
  const allowedEndpoints = (datasourceSpec.plugin.spec as any)?.proxy?.spec?.allowedEndpoints || [];

  const hasExportEndpoint = allowedEndpoints.some(
    (ep: any) =>
      ep.endpointPattern?.includes('/export')
  );

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

  const convertedSeries: TimeSeries[] = convertResultsToTimeSeries(resultsResponse.results as any);

  return {
    series: convertedSeries,
    timeRange: { start, end },
    stepMs: context.suggestedStepMs || 60000, // Default 1 minute
    metadata: {
      executedQueryString: query,
    },
  };
};
