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
import { datasourceSelectValueToSelector, replaceVariables } from '@perses-dev/plugin-system';
import type { JsonData, Notice } from '@perses-dev/spec';

import type {
  ResourceGraphQueryRequestParameters,
  AzureResourceManagerDatasourceClient,
} from '../../datasources/azure-resource-manager-datasource/azure-resource-manager-datasource-types';
import type {
  AzureResourceGraphKqlQuerySpec,
  GenericAzureResourceGraphKqlQuerySpec,
} from './azure-resource-graph-kql-query-types';
import { DATASOURCE_KIND, DEFAULT_DATASOURCE } from './constants';

export const getJsonData: JsonQueryPlugin<AzureResourceGraphKqlQuerySpec>['getJsonData'] = async (spec, context) => {
  return getAzureResourceGraphKqlQueryJsonData(spec, context.datasourceStore, context.variableState);
};

function replaceVariablesAndSplit(value: string, variableState: VariableStateMap): string[] {
  const replaced = replaceVariables(value, variableState);
  return replaced
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

function replaceOptionalArrayVariablesAndSplit(
  value: string[] | undefined,
  variableState: VariableStateMap,
): string[] | undefined {
  if (value) {
    let result = value.flatMap((v) => replaceVariablesAndSplit(v, variableState));
    if (result.length > 0) {
      return result;
    }
  }
  // Empty array is also treated as undefined (i.e. an empty variable can map to undefined)
  return undefined;
}

export async function getAzureResourceGraphKqlQueryJsonData(
  spec: GenericAzureResourceGraphKqlQuerySpec,
  datasourceStore: DatasourceStore,
  variableState: VariableStateMap,
): Promise<JsonData> {
  let notices: Notice[] = [];
  // An empty query is actually valid and tries to return all resources. Don't do that.
  if (!spec.kqlQuery) {
    notices.push({ type: 'error', message: 'KQL query is required' });
  }
  if (notices.length > 0) {
    return { data: [], metadata: { notices } };
  }

  const listDatasourceSelectItems = await datasourceStore.listDatasourceSelectItems(DATASOURCE_KIND);
  const datasourceSelector =
    datasourceSelectValueToSelector(spec.datasource, variableState, listDatasourceSelectItems) ?? DEFAULT_DATASOURCE;
  const client = await datasourceStore.getDatasourceClient<AzureResourceManagerDatasourceClient>(datasourceSelector);

  const kqlQuery = replaceVariables(spec.kqlQuery, variableState);
  const subscriptions = replaceOptionalArrayVariablesAndSplit(spec.subscriptions, variableState);
  const managementGroups = replaceOptionalArrayVariablesAndSplit(spec.managementGroups, variableState);

  // Last minute checks since variables have now been expanded
  notices = [];
  if (!kqlQuery) {
    notices.push({ type: 'error', message: 'KQL query is required (empty variable?)' });
  }
  if (notices.length > 0) {
    return { data: [], metadata: { notices } };
  }

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
