// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the \"License\");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an \"AS IS\" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { QueryDefinition } from '@perses-dev/core';
import { LogQueryPlugin, LogQueryContext, calculateVolumeInterval, parseVariables } from '@perses-dev/plugin-system';

import { getLokiLogData } from './get-loki-log-data';
import { LokiLogQuerySpec } from './loki-log-query-types';
import { LokiLogQueryEditor } from './LokiLogQueryEditor';

export const LokiLogQuery: LogQueryPlugin<LokiLogQuerySpec> = {
  getLogData: getLokiLogData,
  OptionsEditorComponent: LokiLogQueryEditor,
  createInitialOptions: () => ({ query: '' }),
  dependsOn: (spec) => {
    const queryVariables = parseVariables(spec.query);
    const allVariables = [...new Set([...queryVariables])];
    return {
      variables: allVariables,
    };
  },
  createVolumeQuery: (spec: LokiLogQuerySpec, ctx: LogQueryContext): QueryDefinition | null => {
    if (!spec.query || !spec.query.trim()) {
      return null;
    }

    const interval = calculateVolumeInterval(ctx.timeRange.end.getTime() - ctx.timeRange.start.getTime());
    const volumeQuery = `sum by (level, detected_level) (count_over_time(${spec.query}[${interval}]))`;

    return {
      kind: 'TimeSeriesQuery',
      spec: {
        plugin: {
          kind: 'LokiTimeSeriesQuery',
          spec: {
            query: volumeQuery,
            datasource: spec.datasource,
            step: interval,
          },
        },
      },
    };
  },
};
