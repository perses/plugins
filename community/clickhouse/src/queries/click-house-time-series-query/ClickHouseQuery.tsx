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

import { TimeSeriesQueryPlugin, parseVariables } from '@perses-dev/plugin-system';
import { getTimeSeriesData } from './get-click-house-data';
import { ClickHouseTimeSeriesQueryEditor } from './ClickHouseQueryEditor';
import { ClickHouseTimeSeriesQuerySpec } from './click-house-query-types';

export const ClickHouseTimeSeriesQuery: TimeSeriesQueryPlugin<ClickHouseTimeSeriesQuerySpec> = {
  getTimeSeriesData,
  OptionsEditorComponent: ClickHouseTimeSeriesQueryEditor,
  createInitialOptions: () => ({ query: '' }),
  dependsOn: (spec) => {
    const queryVariables = parseVariables(spec.query);
    const allVariables = [...new Set([...queryVariables])];
    return {
      variables: allVariables,
    };
  },
};
