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
import { isDurationString, parseDurationString } from '@perses-dev/spec';
import { milliseconds } from 'date-fns';

/**
 * getMinStepMs converts the min step of a query, a duration or a variable holding one, to milliseconds. It returns
 * undefined when the query has no min step, and throws when the min step is not a duration.
 */
export function getMinStepMs(minStep: string | undefined, variableState: VariableStateMap): number | undefined {
  const written = minStep?.trim();
  if (!written) return undefined;

  // A variable without a value sets no min step.
  const value = replaceVariables(written, variableState).trim();
  if (value === '') return undefined;

  if (!isDurationString(value)) {
    const resolved = value === written ? '' : ` (resolved to '${value}')`;
    throw new Error(`Invalid Min Step '${written}'${resolved}: expected a duration such as 30s or 5m`);
  }
  return milliseconds(parseDurationString(value));
}
