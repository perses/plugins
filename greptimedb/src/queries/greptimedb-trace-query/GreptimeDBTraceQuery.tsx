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

import { parseVariables, TraceQueryPlugin } from '@perses-dev/plugin-system';
import { GreptimeDBTraceQuerySpec } from './greptimedb-trace-query-types';
import { getGreptimeDBTraceData } from './get-greptimedb-trace-data';
import { GreptimeDBTraceQueryEditor } from './GreptimeDBTraceQueryEditor';

export const GreptimeDBTraceQuery: TraceQueryPlugin<GreptimeDBTraceQuerySpec> = {
  getTraceData: getGreptimeDBTraceData,
  OptionsEditorComponent: GreptimeDBTraceQueryEditor,
  createInitialOptions: () => ({
    query: '',
  }),
  dependsOn: (spec) => {
    const queryVariables = parseVariables(spec.query);
    return {
      variables: [...new Set(queryVariables)],
    };
  },
};
