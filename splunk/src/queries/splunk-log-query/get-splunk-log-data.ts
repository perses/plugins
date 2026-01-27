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
import { LogQueryPlugin, LogQueryContext } from './log-query-plugin-interface';

function convertResultsToLogs(
  results:
    | Array<{ _time: string; _raw: string; [key: string]: string | number }>
    | { _time: string; _raw: string; [key: string]: string | number }
): LogData {
  const resultsArray = Array.isArray(results) ? results : [results];

  const entries: LogEntry[] = resultsArray.map((result) => ({
    timestamp: new Date(result._time).getTime() / 1000,
    line: result._raw || JSON.stringify(result),
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
  const client = (await context.datasourceStore.getDatasourceClient<SplunkClient>(
    spec.datasource ?? DEFAULT_DATASOURCE
  )) as SplunkClient;

  const datasourceSpec = await context.datasourceStore.getDatasource(spec.datasource ?? DEFAULT_DATASOURCE);
  const allowedEndpoints = (datasourceSpec.plugin.spec as any)?.proxy?.spec?.allowedEndpoints || [];

  const hasExportEndpoint = allowedEndpoints.some(
    (ep: any) =>
      ep.endpointPattern?.includes('/services/search/v2/jobs/export') ||
      ep.endpointPattern?.includes('/services/search/jobs/export')
  );

  const hasIndexesEndpoint = allowedEndpoints.some(
    (ep: any) =>
      ep.endpointPattern?.includes('/services/data/indexes') || ep.endpointPattern?.includes('/services/data/indexes')
  );

  const { start, end } = context.timeRange;

  const earliest_time = Math.floor(start.getTime() / 1000).toString();
  const latest_time = Math.floor(end.getTime() / 1000).toString();

  let eventsResponse;

  if (hasExportEndpoint || datasourceSpec.plugin.spec.directUrl) {
    eventsResponse = await client.exportSearch({
      search: query,
      earliest_time: spec.earliest || earliest_time,
      latest_time: spec.latest || latest_time,
    });
  } else if (hasIndexesEndpoint || datasourceSpec.plugin.spec.directUrl) {
    const indexesResponse = await client.getIndexes();
    const entries = indexesResponse?.entry
      ? indexesResponse.entry.map((index) => ({
          timestamp: new Date().getTime() / 1000,
          line: index.name,
          labels: Object.fromEntries(
            Object.entries(index)
              .filter(([key]) => key !== 'name' && key !== 'acl' && key !== 'links')
              .map(([key, value]) => [
                key,
                typeof value === 'object'
                  ? JSON.stringify(
                      'currentDBSizeMB-' + value.currentDBSizeMB + ' | ' + 'totalEventCount-' + value.totalEventCount
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
    const jobResponse = await client.createJob({
      search: query,
      earliest_time: spec.earliest || earliest_time,
      latest_time: spec.latest || latest_time,
    });

    const jobId = jobResponse.sid;

    let jobStatus;
    do {
      await new Promise((resolve) => setTimeout(resolve, 500));
      jobStatus = await client.getJobStatus(jobId);
    } while (!jobStatus.entry?.[0]?.content?.isDone);

    eventsResponse = await client.getJobResults(jobId, { count: 100000 });
  }

  const logs = convertResultsToLogs(eventsResponse.results as any);

  return {
    logs,
    timeRange: { start, end },
    metadata: {
      executedQueryString: query,
    },
  };
};
