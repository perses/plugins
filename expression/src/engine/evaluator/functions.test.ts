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

import { ExpressionError } from '../expression-error';
import { applyFunction } from './functions';
import type { Scalar } from './values';

function scalar(v: number | null): Scalar {
  return { kind: 'scalar', value: v };
}

describe('applyFunction', () => {
  it.each([
    ['abs', -5, 5],
    ['abs', 5, 5],
    ['ceil', 1.2, 2],
    ['floor', 1.8, 1],
    ['round', 1.5, 2],
    ['log', Math.E, 1],
    ['log10', 100, 2],
    ['exp', 0, 1],
    ['sqrt', 9, 3],
  ] as const)('%s(%d) = %d', (name, input, expected) => {
    const out = applyFunction(name, [scalar(input)]) as Scalar;
    expect(out.value).toBeCloseTo(expected);
  });

  it('math functions pass null through', () => {
    expect((applyFunction('abs', [scalar(null)]) as Scalar).value).toBeNull();
    expect((applyFunction('sqrt', [scalar(null)]) as Scalar).value).toBeNull();
  });

  it.each([
    ['is_null', null, 1],
    ['is_null', 0, 0],
    ['is_null', NaN, 0],
    ['is_nan', NaN, 1],
    ['is_nan', 1, 0],
    ['is_nan', null, 0],
    ['is_inf', Infinity, 1],
    ['is_inf', -Infinity, 1],
    ['is_inf', 1, 0],
    ['is_inf', null, 0],
    ['is_number', 1, 1],
    ['is_number', NaN, 0],
    ['is_number', Infinity, 0],
    ['is_number', null, 0],
  ] as const)('%s(%p) = %d', (name, input, expected) => {
    expect((applyFunction(name, [scalar(input)]) as Scalar).value).toBe(expected);
  });

  it('throws unknown_function for an unrecognized name', () => {
    expect(() => applyFunction('bogus', [scalar(1)])).toThrow(ExpressionError);
    try {
      applyFunction('bogus', [scalar(1)]);
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('unknown_function');
    }
  });

  it('throws syntax error for wrong arity', () => {
    expect(() => applyFunction('abs', [scalar(1), scalar(2)])).toThrow(ExpressionError);
    try {
      applyFunction('abs', [scalar(1), scalar(2)]);
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('syntax');
    }
  });
});
