// Copyright 2025 The Perses Authors
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

export const TEMPO_DATASOURCE_KIND = 'TempoDatasource' as const;

/**
 * DatasourceSelector for Tempo Datasources.
 */
export interface TempoDatasourceSelector extends DatasourceSelector {
  kind: typeof TEMPO_DATASOURCE_KIND;
}

/**
 * A default selector that asks for the default Tempo Datasource.
 */
export const DEFAULT_TEMPO: TempoDatasourceSelector = { kind: TEMPO_DATASOURCE_KIND };

/**
 * Returns true if the provided datasourceSelectValue is the default TempoDatasourceSelector.
 */
export function isDefaultTempoSelector(datasourceSelectValue: DatasourceSelectValue): boolean {
  return !isVariableDatasource(datasourceSelectValue) && datasourceSelectValue.name === undefined;
}

/**
 * Type guard to make sure a datasourceSelectValue is a Tempo one.
 */
export function isTempoDatasourceSelector(
  datasourceSelectValue: DatasourceSelectValue
): datasourceSelectValue is TempoDatasourceSelector {
  return isVariableDatasource(datasourceSelectValue) || datasourceSelectValue.kind === TEMPO_DATASOURCE_KIND;
}
