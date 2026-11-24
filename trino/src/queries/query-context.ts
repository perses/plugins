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
import type { VariableStateMap } from '@perses-dev/plugin-system';
import { parseVariables, replaceVariables } from '@perses-dev/plugin-system';

import type { TrinoQueryContext } from '../components';

const CONTEXT_FIELDS = ['catalog', 'schema', 'sessionProperties', 'source', 'routingGroup'] as const;

/** interpolateQueryContext replaces dashboard variables in every query context field that is set. */
export function interpolateQueryContext(
  context: TrinoQueryContext,
  variableState: VariableStateMap,
): TrinoQueryContext {
  const result: TrinoQueryContext = {};
  for (const field of CONTEXT_FIELDS) {
    const value = context[field];
    if (value) result[field] = replaceVariables(value, variableState);
  }
  return result;
}

/** queryVariables lists the dashboard variables used by the query and its context fields. */
export function queryVariables(spec: TrinoQueryContext & { query: string }): string[] {
  const texts = [spec.query, ...CONTEXT_FIELDS.map((field) => spec[field] ?? '')];
  return [...new Set(texts.flatMap((text) => parseVariables(text)))];
}
