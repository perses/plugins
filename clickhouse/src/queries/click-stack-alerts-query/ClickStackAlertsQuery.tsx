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

import type { AlertsQueryPlugin } from '@perses-dev/plugin-system';
import { isVariableDatasource, parseVariables } from '@perses-dev/plugin-system';

import type { ClickStackAlertsQuerySpec } from './click-stack-alerts-query-types';
import { ClickStackAlertsQueryEditor } from './ClickStackAlertsQueryEditor';
import { getAlertsData } from './get-click-stack-alerts-data';

export const ClickStackAlertsQuery: AlertsQueryPlugin<ClickStackAlertsQuerySpec> = {
  getAlertsData,
  OptionsEditorComponent: ClickStackAlertsQueryEditor,
  createInitialOptions: () => ({}),
  dependsOn: (spec) => {
    const texts = [...(spec.tags ?? []), spec.search ?? ''];
    if (isVariableDatasource(spec.datasource)) texts.push(spec.datasource);
    return { variables: [...new Set(texts.flatMap((text) => parseVariables(text)))] };
  },
};
