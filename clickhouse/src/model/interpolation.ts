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
import { replaceVariables } from '@perses-dev/plugin-system';

import { commentRanges, isInRanges, quoteString } from './sql';

// Same references as the Perses variables: `$name`, `${name}`, `${name.path}` and `${name:format}`.
const VARIABLE_REFERENCE = /\$\w+|\$\{\w+(?:\.[^:}]+)?(?::[^}]+)?\}/g;
const SQL_STRING_REFERENCE = /^\$\{(\w+):sqlstring\}$/i;

/**
 * interpolateVariables replaces the dashboard variables of a query.
 *
 * The `sqlstring` format is the one to use for string literals, e.g. `ServiceName IN (${service:sqlstring})`. It is
 * rewritten here because ClickHouse reads backslashes as escape characters, which the generic format does not escape:
 * a value ending with a backslash would otherwise break out of its literal.
 *
 * References are replaced in a single pass, so that a `$name` sequence inside a value is never interpolated again.
 * The ones in comments are left as is: a value with a line break or a `*` + `/` sequence would end the comment, and
 * a commented out filter would run, whatever its format.
 */
export function interpolateVariables(sql: string, variableState: VariableStateMap): string {
  const comments = commentRanges(sql);
  return sql.replace(VARIABLE_REFERENCE, (reference: string, offset: number) => {
    if (isInRanges(offset, comments)) return reference;
    const name = SQL_STRING_REFERENCE.exec(reference)?.[1];
    if (name === undefined) return replaceVariables(reference, variableState);
    const state = variableState[name];
    if (state === undefined || state.value === undefined) return reference;
    const values = Array.isArray(state.value) ? state.value : [state.value];
    // An empty selection matches nothing while keeping `IN (...)` valid.
    if (values.length === 0) return 'NULL';
    return values.map((value) => (value === null ? 'NULL' : quoteString(value))).join(',');
  });
}
