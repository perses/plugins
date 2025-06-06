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

export const PYROSCOPE_DATASOURCE_KIND = 'PyroscopeDatasource' as const;

/**
 * DatasourceSelector for Pyroscope Datasources.
 */
export interface PyroscopeDatasourceSelector extends DatasourceSelector {
  kind: typeof PYROSCOPE_DATASOURCE_KIND;
}

/**
 * A default selector that asks for the default Pyroscope Datasource.
 */
export const DEFAULT_PYROSCOPE: PyroscopeDatasourceSelector = { kind: PYROSCOPE_DATASOURCE_KIND };

/**
 * Returns true if the provided PyroscopeDatasourceSelector is the default one.
 */
export function isDefaultPyroscopeSelector(selector: PyroscopeDatasourceSelector): boolean {
  return selector.name === undefined;
}

/**
 * Type guard to make sure a DatasourceSelector is a Pyroscope one.
 */
export function isPyroscopeDatasourceSelector(selector: DatasourceSelector): selector is PyroscopeDatasourceSelector {
  return selector.kind === PYROSCOPE_DATASOURCE_KIND;
}
