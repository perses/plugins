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

import { LogEntry, LogData } from '@perses-dev/core';
import { replaceVariables } from '@perses-dev/plugin-system';
import { SplunkClient } from '../../model/splunk-client';
import { DEFAULT_DATASOURCE } from '../constants';
import { SplunkLogQuerySpec } from './splunk-log-query-types';
import { LogQueryPlugin, LogQueryContext, LogQueryResult } from './log-query-plugin-interface';
import { SplunkIndexResponse, SplunkJobCreateResponse, SplunkJobStatusResponse, SplunkResultsResponse } from '../../model/splunk-client-types';

function convertResultsToLogs(
  results:
    | Array<{ _time: string; _raw: string;[key: string]: string | number }>
    | { _time: string; _raw: string;[key: string]: string | number }
): LogData {
  const resultsArray = Array.isArray(results) ? results : [results];

  const entries: LogEntry[] = resultsArray.map((result) => ({
    timestamp: new Date(result._time).getTime() / 1000,
    line: result._raw || JSON.stringify(result),
    // Convert all other response properties to labels, excluding '_time' and '_raw' as they are used in panel row display
    labels: Object.fromEntries(Object.entries(result).filter(([key]) => key !== '_time' && key !== '_raw')) as Record<
      string,
      string
    >,
  }));

  return {
    entries,
    totalCount: entries.length,
  };
}

export const getSplunkLogData: LogQueryPlugin<SplunkLogQuerySpec>['getLogData'] = async (
  spec: SplunkLogQuerySpec,
  context: LogQueryContext
) => {
  if (!spec.query) {
    return {
      logs: { entries: [], totalCount: 0 },
      timeRange: { start: context.timeRange.start, end: context.timeRange.end },
    };
  }

  const query = replaceVariables(spec.query, context.variableState);
  const client: SplunkClient = (await context.datasourceStore.getDatasourceClient<SplunkClient>(
    spec.datasource ?? DEFAULT_DATASOURCE
  )) as SplunkClient;

  const datasourceSpec = await context.datasourceStore.getDatasource(spec.datasource ?? DEFAULT_DATASOURCE);
  const allowedEndpoints: string[] = (datasourceSpec.plugin.spec as any)?.proxy?.spec?.allowedEndpoints || [];

  const hasExportEndpoint: boolean = allowedEndpoints.some(
    (ep: any) =>
      ep.endpointPattern?.includes('/export')
  );

  const hasIndexesEndpoint: boolean = allowedEndpoints.some(
    (ep: any) =>
      ep.endpointPattern?.includes('/indexes')
  );

  const { start, end } = context.timeRange;

  const earliest_time: string = Math.floor(start.getTime() / 1000).toString();
  const latest_time: string = Math.floor(end.getTime() / 1000).toString();

  let eventsResponse: SplunkResultsResponse;

  if (hasExportEndpoint || datasourceSpec.plugin.spec.directUrl) {
    eventsResponse = await client.exportSearch({
      search: query,
      earliest_time: spec.earliest || earliest_time,
      latest_time: spec.latest || latest_time,
    });
  } else if (hasIndexesEndpoint || datasourceSpec.plugin.spec.directUrl) {
    const indexesResponse: SplunkIndexResponse = await client.getIndexes();
    const entries = indexesResponse?.entry
      ? indexesResponse.entry.map((index) => ({
        // Use current time as timestamp since index response does not include a timestamp.
        timestamp: new Date().getTime() / 1000,
        line: index.name,
        // Convert all other index response properties to labels, excluding 'name' as it is used in panel row display
        labels: Object.fromEntries(
          Object.entries(index)
            .filter(([key]) => key !== 'name')
            .map(([key, value]) => [
              key,
              typeof value === 'object'
                ? JSON.stringify(
                  value
                )
                : String(value),
            ])
        ) as Record<string, string>,
      }))
      : [];

    return {
      logs: {
        entries,
        totalCount: entries.length,
      },
      timeRange: { start, end },
      metadata: {
        executedQueryString: query,
      },
    };
  } else {
    const jobResponse: SplunkJobCreateResponse = await client.createJob({
      search: query,
      earliest_time: spec.earliest || earliest_time,
      latest_time: spec.latest || latest_time,
    });

    const jobId: string = jobResponse.sid;

    let jobStatus: SplunkJobStatusResponse;
    do {
      await new Promise((resolve) => setTimeout(resolve, 500));
      jobStatus = await client.getJobStatus(jobId);
      if (!jobStatus || !jobStatus.entry?.[0]?.content) {
        console.warn('Failed to get job status or job status response is malformed', { jobStatus });
        break;
      }
    } while (!jobStatus.entry?.[0]?.content?.isDone);

    eventsResponse = await client.getJobResults(jobId);
  }

  const logs: LogData = convertResultsToLogs(eventsResponse.results as any);

  return {
    logs,
    timeRange: { start, end },
    metadata: {
      executedQueryString: query,
    },
  };
};
