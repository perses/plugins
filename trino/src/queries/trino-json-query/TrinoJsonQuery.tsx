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

import { queryVariables } from '../query-context';
import { getTrinoJsonData } from './get-trino-json-data';
import type { TrinoJsonQuerySpec } from './trino-json-query-types';
import { TrinoJsonQueryEditor } from './TrinoJsonQueryEditor';

/** TrinoJsonQuery is the JSON query plugin that returns Trino SQL rows as objects. */
export const TrinoJsonQuery: JsonQueryPlugin<TrinoJsonQuerySpec> = {
  getJsonData: getTrinoJsonData,
  OptionsEditorComponent: TrinoJsonQueryEditor,
  createInitialOptions: () => ({ query: '' }),
  dependsOn: (spec) => ({ variables: queryVariables(spec) }),
};
