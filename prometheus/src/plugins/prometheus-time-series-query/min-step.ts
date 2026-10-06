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

import type { VariableStateMap } from '@perses-dev/components';
import { parseVariables, replaceVariables } from '@perses-dev/plugin-system';
import { isDurationString } from '@perses-dev/spec';

import { getDurationStringSeconds } from '../../model';

// The built-in variables replaced by replacePromBuiltinVariables: their values are computed from the step, whose
// lower bound is the Min Step, so they cannot be used to set the Min Step itself.
const STEP_BUILTIN_VARIABLES = new Set(['__interval', '__interval_ms', '__rate_interval']);

/**
 * Resolves the variables used in the Min Step of a query and converts it to seconds, rounding down.
 * Returns undefined when no Min Step is set, so that the caller can fall back to the scrape interval of the datasource.
 * Throws an error that explains the problem when the Min Step is not a valid duration.
 */
export function getMinStepSeconds(minStep: string | undefined, variableState: VariableStateMap): number | undefined {
  if (!minStep) return undefined;

  const value = replaceVariables(minStep, variableState);

  // Checked on the resolved value, so that a dashboard variable whose value is one of them is caught too
  const stepVariable = parseVariables(value).find((name) => STEP_BUILTIN_VARIABLES.has(name));
  if (stepVariable !== undefined) {
    // When it comes from the value of a dashboard variable, also show what the Min Step contains
    const usedDirectly = parseVariables(minStep).some((name) => STEP_BUILTIN_VARIABLES.has(name));
    const subject = usedDirectly ? `'$${stepVariable}'` : `Min Step '${minStep}' resolves to '$${stepVariable}', which`;
    throw new Error(
      `${subject} cannot be used as Min Step, because its value depends on the Min Step. Leave Min Step empty to use the scrape interval of the datasource, or set a duration such as 30s.`,
    );
  }

  // A variable with an empty value means that no Min Step is set
  if (value === '') return undefined;

  if (!isDurationString(value)) {
    const resolved = value === minStep ? '' : ` (resolved to '${value}')`;
    throw new Error(`Invalid Min Step '${minStep}'${resolved}: expected a duration such as 30s or 5m`);
  }

  return getDurationStringSeconds(value);
}
