// Copyright 2023 The Perses Authors
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

import { DatasourceSelector } from '@perses-dev/core';
import { DatasourceSelectValue, isVariableDatasource } from '@perses-dev/plugin-system';

export const PROM_DATASOURCE_KIND = 'PrometheusDatasource' as const;

/**
 * DatasourceSelector for Prom Datasources.
 */
export interface PrometheusDatasourceSelector extends DatasourceSelector {
  kind: typeof PROM_DATASOURCE_KIND;
}

/**
 * A default selector that asks for the default Prom Datasource.
 */
export const DEFAULT_PROM: PrometheusDatasourceSelector = { kind: PROM_DATASOURCE_KIND };

/**
 * Returns true if the provided datasourceSelectValue is the default PrometheusDatasourceSelector.
 */
export function isDefaultPromSelector(
  datasourceSelectValue: DatasourceSelectValue<PrometheusDatasourceSelector>
): boolean {
  return !isVariableDatasource(datasourceSelectValue) && datasourceSelectValue.name === undefined;
}

/**
 * Type guard to make sure a datasourceSelectValue is a Prometheus one.
 */
export function isPrometheusDatasourceSelector(
  datasourceSelectValue: DatasourceSelectValue<DatasourceSelector>
): datasourceSelectValue is PrometheusDatasourceSelector {
  return isVariableDatasource(datasourceSelectValue) || datasourceSelectValue.kind === PROM_DATASOURCE_KIND;
}
