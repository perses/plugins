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

import type { LogQueryPlugin } from '@perses-dev/plugin-system';

import { executeQuery, truncationNotices } from '../../model/execute-query';
import type { ClickHouseLogQuerySpec } from './click-house-log-query-types';
import { buildLogs } from './logs';

export const getClickHouseLogData: LogQueryPlugin<ClickHouseLogQuerySpec>['getLogData'] = async (
  spec,
  context,
  abortSignal,
) => {
  const { timeRange } = context;
  if (!spec.query?.trim()) {
    return { logs: { entries: [], totalCount: 0 }, timeRange };
  }

  const result = await executeQuery(
    spec,
    { datasourceStore: context.datasourceStore, variableState: context.variableState, timeRange },
    abortSignal,
  );
  const { logs, notices } = buildLogs(result);
  const allNotices = [...truncationNotices(result), ...notices];
  if (allNotices.length > 0) {
    logs.metadata = { ...logs.metadata, notices: allNotices };
  }

  return {
    timeRange,
    logs,
    metadata: { executedQueryString: result.executedQueryString },
  };
};
