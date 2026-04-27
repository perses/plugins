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

import { DatasourceSelector } from '@perses-dev/core';
import { DatasourceSelectValue, isVariableDatasource } from '@perses-dev/plugin-system';

export const OPENSEARCH_DATASOURCE_KIND = 'OpenSearchDatasource' as const;

export interface OpenSearchDatasourceSelector extends DatasourceSelector {
  kind: typeof OPENSEARCH_DATASOURCE_KIND;
}

export const DEFAULT_OPENSEARCH: OpenSearchDatasourceSelector = { kind: OPENSEARCH_DATASOURCE_KIND };

export function isDefaultOpenSearchSelector(datasourceSelectValue: DatasourceSelectValue): boolean {
  return !isVariableDatasource(datasourceSelectValue) && datasourceSelectValue.name === undefined;
}

export function isOpenSearchDatasourceSelector(
  datasourceSelectValue: DatasourceSelectValue
): datasourceSelectValue is OpenSearchDatasourceSelector {
  return isVariableDatasource(datasourceSelectValue) || datasourceSelectValue.kind === OPENSEARCH_DATASOURCE_KIND;
}
