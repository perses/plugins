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

import { QueryDefinition } from '@perses-dev/core';
import { parseVariables } from '@perses-dev/plugin-system';
import { getClickHouseLogData } from './get-click-house-log-data';
import { ClickHouseLogQueryEditor } from './ClickHouseLogQueryEditor';
import { ClickHouseLogQuerySpec } from './click-house-log-query-types';
import { LogQueryPlugin } from './log-query-plugin-interface';

export const ClickHouseLogQuery: LogQueryPlugin<ClickHouseLogQuerySpec> = {
  getLogData: getClickHouseLogData,
  OptionsEditorComponent: ClickHouseLogQueryEditor,
  createInitialOptions: () => ({ query: '' }),
  dependsOn: (spec) => {
    const queryVariables = parseVariables(spec.query);
    const allVariables = [...new Set([...queryVariables])];
    return {
      variables: allVariables,
    };
  },
  createVolumeQuery: (spec: ClickHouseLogQuerySpec): QueryDefinition | null => {
    // Only create volume query if there's a valid query
    if (!spec.query || !spec.query.trim()) {
      return null;
    }

    // For ClickHouse, we need to transform the SQL query into a volume aggregation
    // This is a simplified approach that may need refinement based on actual query patterns
    // For now, returning null to indicate volume queries need more sophisticated parsing
    // TODO: Implement proper SQL parsing and transformation for volume queries
    // Example target: SELECT toStartOfInterval(timestamp, INTERVAL 1 minute) as time, level, count() FROM ... GROUP BY time, level

    return null;
  },
};
