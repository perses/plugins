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

import { parseVariables } from '@perses-dev/plugin-system';
import { getOpenSearchLogData } from './get-opensearch-log-data';
import { OpenSearchLogQueryEditor } from './OpenSearchLogQueryEditor';
import { OpenSearchLogQuerySpec } from './opensearch-log-query-types';
import { LogQueryPlugin } from './log-query-plugin-interface';

export const OpenSearchLogQuery: LogQueryPlugin<OpenSearchLogQuerySpec> = {
  getLogData: getOpenSearchLogData,
  OptionsEditorComponent: OpenSearchLogQueryEditor,
  createInitialOptions: () => ({ query: '' }),
  dependsOn: (spec) => {
    const queryVariables = parseVariables(spec.query);
    const indexVariables = spec.index ? parseVariables(spec.index) : [];
    const allVariables = [...new Set([...queryVariables, ...indexVariables])];
    return {
      variables: allVariables,
    };
  },
};
