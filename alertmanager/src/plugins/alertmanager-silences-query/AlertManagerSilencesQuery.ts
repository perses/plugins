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

import { isVariableDatasource, parseVariables, SilencesQueryPlugin } from '@perses-dev/plugin-system';
import { AlertManagerSilencesQuerySpec } from '../types';
import { getSilencesData } from './get-silences-data';
import { AlertManagerSilencesQueryEditor } from './AlertManagerSilencesQueryEditor';

export const AlertManagerSilencesQuery: SilencesQueryPlugin<AlertManagerSilencesQuerySpec> = {
  getSilencesData,
  OptionsEditorComponent: AlertManagerSilencesQueryEditor,
  createInitialOptions: (): AlertManagerSilencesQuerySpec => ({
    datasource: undefined,
    filters: [],
  }),
  dependsOn: (spec: AlertManagerSilencesQuerySpec) => {
    const datasourceVariables = isVariableDatasource(spec.datasource) ? parseVariables(spec.datasource ?? '') : [];
    const filterVariables = spec.filters?.flatMap((f) => parseVariables(f)) ?? [];
    return {
      variables: [...new Set([...datasourceVariables, ...filterVariables])],
    };
  },
};
