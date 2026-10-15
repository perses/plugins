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

import { PrometheusDatasource } from '../prometheus-datasource';
import { getMinStepSeconds } from './min-step';

// The state of the built-in variables of the Prometheus datasource in a dashboard, built as plugin-system does.
// They resolve to themselves: they are only replaced in the PromQL query, with values computed from the step.
const PROMETHEUS_BUILTIN_VARIABLES: VariableStateMap = Object.fromEntries(
  (PrometheusDatasource.getBuiltinVariableDefinitions?.() ?? []).map(({ spec }) => [
    spec.name,
    { value: spec.value(), loading: false },
  ]),
);

describe('getMinStepSeconds', () => {
  it('should return undefined when no Min Step is set', () => {
    expect(getMinStepSeconds(undefined, {})).toBeUndefined();
    expect(getMinStepSeconds('', {})).toBeUndefined();
  });

  it.each([
    { minStep: '30s', expected: 30 },
    { minStep: '1m30s', expected: 90 },
    { minStep: '1500ms', expected: 1 },
    { minStep: '0s', expected: 0 },
  ])('should convert $minStep to seconds', ({ minStep, expected }) => {
    expect(getMinStepSeconds(minStep, PROMETHEUS_BUILTIN_VARIABLES)).toBe(expected);
  });

  it('should resolve the variables used in the Min Step', () => {
    expect(getMinStepSeconds('$resolution', { resolution: { value: '5m', loading: false } })).toBe(300);
  });

  it('should return undefined when a variable used as Min Step has an empty value', () => {
    expect(getMinStepSeconds('$resolution', { resolution: { value: '', loading: false } })).toBeUndefined();
  });

  it.each([
    { minStep: '$__rate_interval', variable: '$__rate_interval' },
    { minStep: '${__rate_interval}', variable: '$__rate_interval' },
    { minStep: '$__interval', variable: '$__interval' },
    { minStep: '$__interval_ms', variable: '$__interval_ms' },
  ])('should explain that $minStep cannot be used as Min Step', ({ minStep, variable }) => {
    const expected = `'${variable}' cannot be used as Min Step`;
    expect(() => getMinStepSeconds(minStep, PROMETHEUS_BUILTIN_VARIABLES)).toThrow(expected);
    expect(() => getMinStepSeconds(minStep, {})).toThrow(expected);
  });

  it('should explain that no built-in variable of the Prometheus datasource can be used as Min Step', () => {
    // They are all computed from the step (see replacePromBuiltinVariables).
    // This fails if one is added to the datasource but not to STEP_BUILTIN_VARIABLES.
    const names = Object.keys(PROMETHEUS_BUILTIN_VARIABLES);
    expect(names).toContain('__rate_interval');
    for (const name of names) {
      expect(() => getMinStepSeconds(`$${name}`, PROMETHEUS_BUILTIN_VARIABLES)).toThrow(
        `'$${name}' cannot be used as Min Step`,
      );
    }
  });

  it('should tell how to fix a Min Step that uses $__rate_interval', () => {
    expect(() => getMinStepSeconds('$__rate_interval', PROMETHEUS_BUILTIN_VARIABLES)).toThrow(
      new Error(
        "'$__rate_interval' cannot be used as Min Step, because its value depends on the Min Step. Leave Min Step empty to use the scrape interval of the datasource, or set a duration such as 30s.",
      ),
    );
  });

  it('should name the Min Step when a variable used as Min Step resolves to $__rate_interval', () => {
    const variableState: VariableStateMap = {
      ...PROMETHEUS_BUILTIN_VARIABLES,
      resolution: { value: '$__rate_interval', loading: false },
    };
    expect(() => getMinStepSeconds('$resolution', variableState)).toThrow(
      new Error(
        "Min Step '$resolution' resolves to '$__rate_interval', which cannot be used as Min Step, because its value depends on the Min Step. Leave Min Step empty to use the scrape interval of the datasource, or set a duration such as 30s.",
      ),
    );
  });

  it('should name the Min Step when it is not a duration', () => {
    expect(() => getMinStepSeconds('30 s', {})).toThrow(
      new Error("Invalid Min Step '30 s': expected a duration such as 30s or 5m"),
    );
  });

  it('should show the resolved value when a variable used as Min Step is not a duration', () => {
    expect(() => getMinStepSeconds('$resolution', { resolution: { value: 'abc', loading: false } })).toThrow(
      new Error("Invalid Min Step '$resolution' (resolved to 'abc'): expected a duration such as 30s or 5m"),
    );
  });
});
