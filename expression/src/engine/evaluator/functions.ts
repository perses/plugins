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

import {
  absDependencies,
  ceilDependencies,
  create,
  expDependencies,
  floorDependencies,
  log10Dependencies,
  logDependencies,
  roundDependencies,
  sqrtDependencies,
} from 'mathjs';

import { ExpressionError } from '../expression-error';
import type { Sample, Value } from './values';

const { abs, ceil, floor, round, log, log10, exp, sqrt } = create({
  ...absDependencies,
  ...ceilDependencies,
  ...floorDependencies,
  ...roundDependencies,
  ...logDependencies,
  ...log10Dependencies,
  ...expDependencies,
  ...sqrtDependencies,
});

type SampleFn = (a: Sample) => Sample;

const REGISTRY: Record<string, { arity: number; apply: (...args: Sample[]) => Sample }> = {
  abs: { arity: 1, apply: mathFn(abs) },
  ceil: { arity: 1, apply: mathFn(ceil) },
  floor: { arity: 1, apply: mathFn(floor) },
  round: { arity: 1, apply: mathFn(round) },
  log: { arity: 1, apply: mathFn(log) },
  log10: { arity: 1, apply: mathFn(log10) },
  exp: { arity: 1, apply: mathFn(exp) },
  sqrt: { arity: 1, apply: mathFn(sqrt) },
  // Predicates return 1/0 and, unlike the math functions, do not pass null through: a null sample is
  // "null" (is_null → 1) and is neither NaN, Inf, nor a number.
  is_null: { arity: 1, apply: (a) => toInt(a === null) },
  is_nan: { arity: 1, apply: (a) => toInt(a !== null && Number.isNaN(a)) },
  is_inf: { arity: 1, apply: (a) => toInt(a !== null && (a === Infinity || a === -Infinity)) },
  is_number: { arity: 1, apply: (a) => toInt(a !== null && Number.isFinite(a)) },
};

export const FUNCTION_NAMES: readonly string[] = Object.freeze(Object.keys(REGISTRY));

/**
 * Applies a built-in unary function to a {@link Value}.
 *
 * Scalars are mapped directly; series have the function applied element-wise per sample. Throws
 * {@link ExpressionError} for unknown function names or wrong argument counts.
 */
export function applyFunction(name: string, args: Value[]): Value {
  const entry = REGISTRY[name];
  if (!entry) {
    throw new ExpressionError({
      code: 'unknown_function',
      message: `unknown function: ${name}. Known functions: ${FUNCTION_NAMES.join(', ')}`,
    });
  }
  const [arg] = args;
  if (args.length !== entry.arity || arg === undefined) {
    throw new ExpressionError({
      code: 'syntax',
      message: `${name}() takes ${entry.arity} argument(s), got ${args.length}`,
    });
  }

  if (arg.kind === 'scalar') {
    return { kind: 'scalar', value: entry.apply(arg.value) };
  }
  return {
    kind: 'series',
    grid: arg.grid,
    series: arg.series.map((s) => ({ ...s, values: s.values.map((v) => entry.apply(v)) })),
  };
}

function mathFn(fn: (x: number) => number): SampleFn {
  return (a) => (a === null ? null : fn(a));
}

function toInt(val: boolean): Sample {
  return val ? 1 : 0;
}
