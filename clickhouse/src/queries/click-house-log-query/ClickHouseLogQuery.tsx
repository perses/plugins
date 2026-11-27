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

import { queryDependencies } from '../../model/execute-query';
import type { ClickHouseLogQuerySpec } from './click-house-log-query-types';
import { ClickHouseLogQueryEditor } from './ClickHouseLogQueryEditor';
import { getClickHouseLogData } from './get-click-house-log-data';
import { buildVolumeQuery } from './volume-query';

export const ClickHouseLogQuery: LogQueryPlugin<ClickHouseLogQuerySpec> = {
  getLogData: getClickHouseLogData,
  OptionsEditorComponent: ClickHouseLogQueryEditor,
  createInitialOptions: () => ({ query: '' }),
  dependsOn: (spec) => queryDependencies(spec.datasource, spec.query),
  createVolumeQuery: (spec) => {
    const query = spec.query?.trim() ? buildVolumeQuery(spec.query) : undefined;
    if (query === undefined) return null;
    return {
      kind: 'TimeSeriesQuery',
      spec: {
        plugin: {
          kind: 'ClickHouseTimeSeriesQuery',
          spec: { datasource: spec.datasource, query, seriesNameFormat: '{{level}}' },
        },
      },
    };
  },
};
