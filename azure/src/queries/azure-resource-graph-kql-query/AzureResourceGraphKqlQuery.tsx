// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type { JsonQueryPlugin } from '@perses-dev/plugin-system';
import { parseVariables } from '@perses-dev/plugin-system';

import type { AzureResourceGraphKqlQuerySpec } from './azure-resource-graph-kql-query-types';
import { AzureResourceGraphKqlQueryEditor } from './AzureResourceGraphKqlQueryEditor';
import { getJsonData } from './get-json-data';

const initialOptions: AzureResourceGraphKqlQuerySpec = {
  kqlQuery: '',
};

export const AzureResourceGraphKqlQuery: JsonQueryPlugin<AzureResourceGraphKqlQuerySpec> = {
  getJsonData,
  OptionsEditorComponent: AzureResourceGraphKqlQueryEditor,
  createInitialOptions: () => initialOptions,
  dependsOn: (spec) => {
    const queryVariables = [
      parseVariables(spec.kqlQuery),
      spec.subscriptions ? spec.subscriptions.flatMap((s) => parseVariables(s)) : [],
      spec.managementGroups ? spec.managementGroups.flatMap((s) => parseVariables(s)) : [],
    ].flat();
    return {
      variables: [...new Set(queryVariables)],
    };
  },
};
