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

import type { DatasourceSelectValue, DatasourceStore, VariableStateMap } from '@perses-dev/plugin-system';
import { datasourceSelectValueToSelector, isVariableDatasource } from '@perses-dev/plugin-system';
import type { DatasourceSelector } from '@perses-dev/spec';

/**
 * getDatasourceClient returns the client of the datasource of a query: the selected datasource, the one named by a
 * variable, or the default datasource of the kind.
 */
export async function getDatasourceClient<Client>(
  datasource: DatasourceSelectValue | undefined,
  kind: string,
  defaultSelector: DatasourceSelector,
  context: { datasourceStore: DatasourceStore; variableState: VariableStateMap },
): Promise<Client> {
  const { datasourceStore, variableState } = context;
  if (!isVariableDatasource(datasource)) {
    return datasourceStore.getDatasourceClient<Client>(datasource ?? defaultSelector);
  }
  // Only a datasource variable needs the list of the datasources to be resolved.
  const selector = datasourceSelectValueToSelector(
    datasource,
    variableState,
    await datasourceStore.listDatasourceSelectItems(kind),
  );
  return datasourceStore.getDatasourceClient<Client>(selector ?? defaultSelector);
}
