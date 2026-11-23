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
import type { Sample, Series, SeriesSet, Value } from './values';

export const BINARY_OPS = ['+', '-', '*', '/', '%', '^', '==', '!=', '<', '<=', '>', '>=', 'and', 'or'] as const;
export const UNARY_OPS = ['-', '+', 'not'] as const;
export type BinaryOp = (typeof BINARY_OPS)[number];
export type UnaryOp = (typeof UNARY_OPS)[number];

/**
 * Applies a unary operator to a {@link Value}. Scalars are mapped directly; series are mapped
 * element-wise.
 */
export function applyUnary(op: UnaryOp, val: Value): Value {
  if (val.kind === 'scalar') {
    return { kind: 'scalar', value: applyUnaryToSample(op, val.value) };
  }
  return broadcastScalarToSeries(val, (v) => applyUnaryToSample(op, v));
}

/**
 * Applies a binary operator to two {@link Value}s.
 *
 * - scalar × scalar → scalar
 * - scalar × series (or series × scalar) → series (scalar broadcast)
 * - series × series → strict label-set match; pairs with equal labels are combined, unmatched
 *   series are dropped. Throws {@link ExpressionError} with `no_match` when no pairs can be
 *   formed from non-empty inputs.
 */
export function applyBinary(op: BinaryOp, left: Value, right: Value): Value {
  if (left.kind === 'scalar' && right.kind === 'scalar') {
    return { kind: 'scalar', value: applyBinaryToSample(op, left.value, right.value) };
  }
  if (left.kind === 'scalar' && right.kind === 'series') {
    return broadcastScalarToSeries(right, (v) => applyBinaryToSample(op, left.value, v));
  }
  if (left.kind === 'series' && right.kind === 'scalar') {
    return broadcastScalarToSeries(left, (v) => applyBinaryToSample(op, v, right.value));
  }
  if (left.kind === 'series' && right.kind === 'series') {
    return strictMatch(op, left, right);
  }
  throw new ExpressionError({
    code: 'syntax',
    message: `unexpected value kinds for binary operator ${op}: ${left.kind} and ${right.kind}`,
  });
}

function toInt(val: boolean): number {
  return val ? 1 : 0;
}

function applyUnaryToSample(op: UnaryOp, a: Sample): Sample {
  switch (op) {
    case '-':
      return a === null ? null : -a;
    case '+':
      return a;
    case 'not':
      return toInt(a === null || a === 0);
  }
}

function applyBinaryToSample(op: BinaryOp, a: Sample, b: Sample): Sample {
  switch (op) {
    case '+':
    case '-':
    case '*':
    case '/':
    case '%':
    case '^':
      return a === null || b === null ? null : applyArithmetic(op, a, b);
    case '==':
      return toInt(a !== null && b !== null && a === b);
    case '!=':
      return toInt(a !== null && b !== null && a !== b);
    case '<':
      return toInt(a !== null && b !== null && a < b);
    case '<=':
      return toInt(a !== null && b !== null && a <= b);
    case '>':
      return toInt(a !== null && b !== null && a > b);
    case '>=':
      return toInt(a !== null && b !== null && a >= b);
    case 'and':
      return toInt(a !== null && a !== 0 && b !== null && b !== 0);
    case 'or':
      return toInt((a !== null && a !== 0) || (b !== null && b !== 0));
  }
}

function applyArithmetic(op: '+' | '-' | '*' | '/' | '%' | '^', a: number, b: number): number {
  switch (op) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      return a / b;
    case '%':
      return a % b;
    case '^':
      return a ** b;
  }
}

function broadcastScalarToSeries(seriesSet: SeriesSet, seriesMapper: (v: Sample) => Sample): SeriesSet {
  return {
    kind: 'series',
    grid: seriesSet.grid,
    series: seriesSet.series.map((s) => ({
      ...s,
      values: s.values.map(seriesMapper),
    })),
  };
}

function buildKeyMap(series: Series[], side: 'left' | 'right'): Map<string, Series> {
  const map = new Map<string, Series>();
  for (const s of series) {
    if (map.has(s.key)) {
      throw new ExpressionError({
        code: 'no_match',
        message: `duplicate label set on ${side} side of binary operation`,
      });
    }
    map.set(s.key, s);
  }
  return map;
}

function throwIfNoMatch(left: SeriesSet, right: SeriesSet, pairCount: number): void {
  const firstLeft = left.series[0];
  const firstRight = right.series[0];
  if (pairCount === 0 && firstLeft && firstRight) {
    throw new ExpressionError({
      code: 'no_match',
      message: `no series with matching labels; left example: ${firstLeft.key}, right example: ${firstRight.key}`,
    });
  }
}

function strictMatch(op: BinaryOp, left: SeriesSet, right: SeriesSet): SeriesSet {
  if (left.grid.length !== right.grid.length) {
    throw new ExpressionError({
      code: 'no_match',
      message: `series operands have different grid lengths (${left.grid.length} vs ${right.grid.length}); this is a bug`,
    });
  }

  const leftMap = buildKeyMap(left.series, 'left');
  const rightMap = buildKeyMap(right.series, 'right');

  const pairs: Array<{ leftSeries: Series; rightSeries: Series }> = [];
  for (const [key, leftSeries] of leftMap) {
    const rightSeries = rightMap.get(key);
    if (rightSeries) {
      pairs.push({ leftSeries, rightSeries });
    }
  }

  throwIfNoMatch(left, right, pairs.length);

  return {
    kind: 'series',
    grid: left.grid,
    series: pairs.map(({ leftSeries, rightSeries }) => ({
      name: leftSeries.name,
      labels: leftSeries.labels,
      key: leftSeries.key,
      values: leftSeries.values.map((v, i) => applyBinaryToSample(op, v, rightSeries.values[i] ?? null)),
    })),
  };
}
