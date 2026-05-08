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

import { DatasourceSelector, QueryDefinition } from '@perses-dev/core';
import { DatasourceSelectValue, isVariableDatasource } from '@perses-dev/plugin-system';

export const ALERTMANAGER_DATASOURCE_KIND = 'AlertManagerDatasource' as const;

export interface AlertManagerDatasourceSelector extends DatasourceSelector {
  kind: typeof ALERTMANAGER_DATASOURCE_KIND;
}

export const DEFAULT_ALERTMANAGER: AlertManagerDatasourceSelector = { kind: ALERTMANAGER_DATASOURCE_KIND };

export function isDefaultAlertManagerSelector(datasourceSelectValue: DatasourceSelectValue): boolean {
  return !isVariableDatasource(datasourceSelectValue) && datasourceSelectValue.name === undefined;
}

export function isAlertManagerDatasourceSelector(
  datasourceSelectValue: DatasourceSelectValue
): datasourceSelectValue is AlertManagerDatasourceSelector {
  return isVariableDatasource(datasourceSelectValue) || datasourceSelectValue.kind === ALERTMANAGER_DATASOURCE_KIND;
}

export function extractDatasourceSelector(queryResults: Array<{ definition: QueryDefinition }>): DatasourceSelector {
  const defSpec: unknown = queryResults[0]?.definition?.spec;
  if (defSpec && typeof defSpec === 'object' && 'plugin' in defSpec) {
    const plugin = (defSpec as Record<string, unknown>).plugin;
    if (plugin && typeof plugin === 'object' && 'spec' in plugin) {
      const spec = (plugin as Record<string, unknown>).spec;
      if (spec && typeof spec === 'object' && 'datasource' in spec) {
        const ds = (spec as Record<string, unknown>).datasource;
        if (ds && typeof ds === 'object' && 'kind' in ds) {
          return ds as DatasourceSelector;
        }
      }
    }
  }
  return DEFAULT_ALERTMANAGER;
}
