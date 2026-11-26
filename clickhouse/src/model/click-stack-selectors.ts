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

import type { DatasourceSelectValue } from '@perses-dev/plugin-system';
import { isVariableDatasource } from '@perses-dev/plugin-system';
import type { DatasourceSelector } from '@perses-dev/spec';

export const CLICKSTACK_DATASOURCE_KIND = 'ClickStackDatasource' as const;

export interface ClickStackDatasourceSelector extends DatasourceSelector {
  kind: typeof CLICKSTACK_DATASOURCE_KIND;
}

/** Selects the default ClickStack datasource. */
export const DEFAULT_CLICKSTACK: ClickStackDatasourceSelector = { kind: CLICKSTACK_DATASOURCE_KIND };

/** Datasource of a ClickStack query: a ClickStack datasource, or a variable holding the name of one. */
export type ClickStackDatasourceSelectValue = DatasourceSelectValue<ClickStackDatasourceSelector>;

export function isClickStackDatasourceSelectValue(
  value: DatasourceSelectValue,
): value is ClickStackDatasourceSelectValue {
  return isVariableDatasource(value) || value.kind === CLICKSTACK_DATASOURCE_KIND;
}
