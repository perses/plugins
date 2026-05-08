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

import { datasourceSelectValueToSelector, replaceVariables, SilencesQueryContext } from '@perses-dev/plugin-system';
import { Silence, SilencesData } from '@perses-dev/spec';
import { ALERTMANAGER_DATASOURCE_KIND, AlertManagerClient, DEFAULT_ALERTMANAGER, GettableSilence } from '../../model';
import { AlertManagerSilencesQuerySpec } from '../types';
/**
 * Transform a GettableSilence from the Alertmanager API into our normalized Silence format.
 */
function transformSilence(apiSilence: GettableSilence): Silence {
  return {
    id: apiSilence.id,
    state: apiSilence.status.state,
    matchers: apiSilence.matchers.map((m) => ({
      name: m.name,
      value: m.value,
      isRegex: m.isRegex,
      isEqual: m.isEqual,
    })),
    startsAt: apiSilence.startsAt,
    endsAt: apiSilence.endsAt,
    createdBy: apiSilence.createdBy,
    comment: apiSilence.comment,
    updatedAt: apiSilence.updatedAt,
  };
}

/**
 * Get silences data from Alert Manager, transforming the API response into the plugin-system SilencesData format.
 */
export async function getSilencesData(
  spec: AlertManagerSilencesQuerySpec,
  context: SilencesQueryContext
): Promise<SilencesData> {
  const listDatasourceSelectItems =
    await context.datasourceStore.listDatasourceSelectItems(ALERTMANAGER_DATASOURCE_KIND);
  const datasourceSelector =
    datasourceSelectValueToSelector(spec.datasource, context.variableState, listDatasourceSelectItems) ??
    DEFAULT_ALERTMANAGER;
  const client = await context.datasourceStore.getDatasourceClient<AlertManagerClient>(datasourceSelector);

  const interpolatedFilters = spec.filters?.map((f) => replaceVariables(f, context.variableState));

  const apiSilences = await client.getSilences({
    filter: interpolatedFilters,
  });

  const silences = apiSilences.map(transformSilence);

  return {
    silences,
    metadata: {
      executedQueryString: buildQueryString(spec),
    },
  };
}

function buildQueryString(spec: AlertManagerSilencesQuerySpec): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries({
        filters: spec.filters,
      }).filter(([, value]) => value !== undefined)
    )
  );
}
