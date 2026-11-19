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

import type { VariablePlugin } from '@perses-dev/plugin-system';
import { isVariableDatasource, parseVariables } from '@perses-dev/plugin-system';

import { getAzureResourceGraphKqlQueryJsonData } from '../../queries';
import type { AzureResourceGraphKqlVariableSpec } from './azure-resource-graph-kql-variable-types';
import { AzureResourceGraphKqlVariableEditor } from './AzureResourceGraphKqlVariableEditor';
import { DEFAULT_VALUE_COLUMN_NAME } from './constants';
import { resourceGraphRowsToVariableOptions } from './resource-graph-rows-to-variable-options';

const initialOptions: AzureResourceGraphKqlVariableSpec = {
  kqlQuery: '',
  labelColumnName: undefined,
  valueColumnName: DEFAULT_VALUE_COLUMN_NAME,
};

export const AzureResourceGraphKqlVariable: VariablePlugin<AzureResourceGraphKqlVariableSpec> = {
  getVariableOptions: async (spec, ctx) => {
    const response = await getAzureResourceGraphKqlQueryJsonData(spec, ctx.datasourceStore, ctx.variables);
    return { data: resourceGraphRowsToVariableOptions(response.data, spec.labelColumnName, spec.valueColumnName) };
  },
  dependsOn: (spec) => {
    const queryVariables = [
      parseVariables(spec.kqlQuery),
      spec.subscriptions ? spec.subscriptions.flatMap((s) => parseVariables(s)) : [],
      spec.managementGroups ? spec.managementGroups.flatMap((s) => parseVariables(s)) : [],
    ].flat();
    const datasourceVariable = isVariableDatasource(spec.datasource) ? parseVariables(spec.datasource ?? '') : [];
    return { variables: [...new Set([...queryVariables, ...datasourceVariable])] };
  },
  OptionsEditorComponent: AzureResourceGraphKqlVariableEditor,
  createInitialOptions: () => initialOptions,
};
