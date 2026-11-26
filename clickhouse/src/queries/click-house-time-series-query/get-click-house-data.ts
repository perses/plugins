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
import type { Notice, TimeSeriesData, TimeSeriesExemplars } from '@perses-dev/spec';

import type { ClickHouseQueryContext } from '../../model/execute-query';
import { executeQuery, truncationNotices } from '../../model/execute-query';
import type { ClickHouseTimeSeriesQuerySpec } from './click-house-query-types';
import { getMinStepMs } from './min-step';
import { buildExemplars, buildTimeSeries } from './time-series';

export const getTimeSeriesData: TimeSeriesQueryPlugin<ClickHouseTimeSeriesQuerySpec>['getTimeSeriesData'] = async (
  spec,
  context,
  abortSignal,
) => {
  if (!spec.query?.trim()) {
    return { series: [] };
  }

  const { timeRange, variableState } = context;
  const queryContext: ClickHouseQueryContext = {
    datasourceStore: context.datasourceStore,
    variableState,
    timeRange,
    suggestedStepMs: context.suggestedStepMs,
    minStepMs: getMinStepMs(spec.minStep, variableState),
  };

  // Exemplars are points in time: they have no place in the single value of an instant query.
  const exemplarQuery = context.mode === 'instant' ? undefined : spec.exemplarQuery?.trim();
  const [result, exemplarResult] = await Promise.all([
    executeQuery(spec, queryContext, abortSignal),
    exemplarQuery
      ? // The series are still worth showing when their exemplars can not be read: report the failure as a notice.
        executeQuery({ datasource: spec.datasource, query: exemplarQuery }, queryContext, abortSignal).catch(
          (error: unknown) => (error instanceof Error ? error : new Error(String(error))),
        )
      : undefined,
  ]);

  const built = buildTimeSeries(result, {
    instant: timeRange.end.getTime(),
    rangeStart: timeRange.start.getTime(),
    intervalMs: result.intervalMs,
    seriesNameFormat: spec.seriesNameFormat ? replaceVariables(spec.seriesNameFormat, variableState) : undefined,
  });

  const notices: Notice[] = [...truncationNotices(result), ...built.notices];
  let exemplars: TimeSeriesExemplars[] = built.exemplars;
  if (exemplarResult instanceof Error) {
    if (abortSignal?.aborted) throw exemplarResult;
    notices.push({ type: 'warning', message: `Exemplars are not shown. ${exemplarResult.message}` });
  } else if (exemplarResult) {
    exemplars = [...exemplars, ...buildExemplars(exemplarResult, built.series)];
    notices.push(...truncationNotices(exemplarResult));
  }

  const data: TimeSeriesData = {
    series: built.series,
    // The time grid of the series: charts place the points on it.
    timeRange: { start: new Date(built.start), end: timeRange.end },
    stepMs: built.stepMs,
    metadata: {
      executedQueryString: result.executedQueryString,
      ...(notices.length > 0 && { notices }),
    },
  };
  if (exemplars.length > 0) data.exemplars = exemplars;
  return data;
};
