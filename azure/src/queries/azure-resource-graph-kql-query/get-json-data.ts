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

import type { DatasourceStore, JsonQueryPlugin, VariableStateMap } from '@perses-dev/plugin-system';
import { replaceVariables } from '@perses-dev/plugin-system';
import type { JsonData } from '@perses-dev/spec';

import type {
  ResourceGraphQueryRequestParameters,
  AzureResourceManagerDatasourceClient,
} from '../../datasources/azure-resource-manager-datasource/azure-resource-manager-datasource-types';
import type {
  AzureResourceGraphKqlQuerySpec,
  GenericAzureResourceGraphKqlQuerySpec,
} from './azure-resource-graph-kql-query-types';
import { DEFAULT_DATASOURCE } from './constants';

export const getJsonData: JsonQueryPlugin<AzureResourceGraphKqlQuerySpec>['getJsonData'] = async (spec, context) => {
  return getAzureResourceGraphKqlQueryJsonData(spec, context.datasourceStore, context.variableState);
};

function replaceVariablesAndSplit(value: string, variableState: VariableStateMap): string[] {
  const replaced = replaceVariables(value, variableState);
  return replaced.split(',').map((s) => s.trim());
}

export async function getAzureResourceGraphKqlQueryJsonData(
  spec: GenericAzureResourceGraphKqlQuerySpec,
  datasourceStore: DatasourceStore,
  variableState: VariableStateMap,
): Promise<JsonData> {
  // An empty query is actually valid and tries to return all resources. Don't do that.
  if (!spec.kqlQuery) {
    return { data: [] };
  }

  const client = await datasourceStore.getDatasourceClient<AzureResourceManagerDatasourceClient>(
    spec.datasource ?? DEFAULT_DATASOURCE,
  );

  const kqlQuery = replaceVariables(spec.kqlQuery, variableState);
  const subscriptions = spec.subscriptions
    ? spec.subscriptions.flatMap((s) => replaceVariablesAndSplit(s, variableState))
    : undefined;
  const managementGroups = spec.managementGroups
    ? spec.managementGroups.flatMap((s) => replaceVariablesAndSplit(s, variableState))
    : undefined;
  const request: ResourceGraphQueryRequestParameters = {
    kqlQuery,
    subscriptions,
    managementGroups,
  };

  const response = await client.resourceGraphQuery(request);
  return {
    data: response.data,
    metadata: {
      notices: response.warning ? [{ type: 'warning', message: response.warning }] : undefined,
    },
  };
}
