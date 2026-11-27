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

export const CLICKHOUSE_DATASOURCE_KIND = 'ClickHouseDatasource' as const;

export interface ClickHouseDatasourceSelector extends DatasourceSelector {
  kind: typeof CLICKHOUSE_DATASOURCE_KIND;
}

/** Selects the default ClickHouse datasource. */
export const DEFAULT_CLICKHOUSE: ClickHouseDatasourceSelector = { kind: CLICKHOUSE_DATASOURCE_KIND };

/** Datasource of a ClickHouse query: a ClickHouse datasource, or a variable holding the name of one. */
export type ClickHouseDatasourceSelectValue = DatasourceSelectValue<ClickHouseDatasourceSelector>;

export function isClickHouseDatasourceSelectValue(
  value: DatasourceSelectValue,
): value is ClickHouseDatasourceSelectValue {
  return isVariableDatasource(value) || value.kind === CLICKHOUSE_DATASOURCE_KIND;
}
