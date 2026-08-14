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

import type { JsonQueryPlugin } from '@perses-dev/plugin-system';
import { parseVariables } from '@perses-dev/plugin-system';

import { getJsonData } from './get-json-data';
import type { JsonQuerySpec } from './json-query-types';
import { JsonQueryEditor } from './JsonQueryEditor';

export const JsonQuery: JsonQueryPlugin<JsonQuerySpec> = {
  getJsonData,
  OptionsEditorComponent: JsonQueryEditor,
  createInitialOptions: () => ({ endpointUrl: '', method: 'GET' }),
  dependsOn: (spec) => {
    const fromEndpoint = parseVariables(spec.endpointUrl);
    const fromParams = Object.values(spec.queryParams ?? {}).flatMap(parseVariables);
    const fromBody = spec.body ? parseVariables(spec.body) : [];
    return { variables: [...new Set([...fromEndpoint, ...fromParams, ...fromBody])] };
  },
};
