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

import { isVariableDatasource, parseVariables, TraceQueryPlugin } from '@perses-dev/plugin-system';
import { TempoTraceQuerySpec } from '../../model';
import { getTraceData } from './get-trace-data';
import { TempoTraceQueryEditor } from './TempoTraceQueryEditor';

/**
 * The core Tempo TraceQuery plugin for Perses.
 */
export const TempoTraceQuery: TraceQueryPlugin<TempoTraceQuerySpec> = {
  getTraceData,
  OptionsEditorComponent: TempoTraceQueryEditor,
  createInitialOptions: () => ({
    query: '',
    limit: 20,
    datasource: undefined,
  }),
  dependsOn: (spec) => {
    const datasourceVariables = isVariableDatasource(spec.datasource) ? parseVariables(spec.datasource ?? '') : [];

    return {
      variables: [...datasourceVariables],
    };
  },
};
