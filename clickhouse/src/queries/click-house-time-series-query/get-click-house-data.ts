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
import { ClickHouseTimeSeriesQuerySpec, DatasourceQueryResponse } from './click-house-query-types';
import { DEFAULT_DATASOURCE } from '../constants';
import { TimeSeriesEntry } from '../../model/click-house-data-types';
import { ClickHouseClient, ClickHouseQueryResponse } from '../../model/click-house-client';

function buildTimeSeries(response?: DatasourceQueryResponse): TimeSeries[] {
  if (!response || !response.data || response.data.length === 0) {
    return [];
  }

  const values: Array<[number, number]> = response.data.map((row: TimeSeriesEntry) => {
    const timestamp = new Date(row.time).getTime();
    const value = Number(row.log_count);
    return [timestamp, value];
  });

  return [
    {
      name: 'log_count',
      values,
    },
  ];
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

  const response: ClickHouseQueryResponse = await client.query({
    start: start.getTime().toString(),
    end: end.getTime().toString(),
    query,
  });

  return {
    series: buildTimeSeries(response),
    timeRange: { start, end },
    stepMs: 30 * 1000,
    metadata: {
      executedQueryString: query,
    },
  };
};
