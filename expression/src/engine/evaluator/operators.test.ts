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
import { applyBinary, applyUnary } from './operators';
import type { Scalar, SeriesSet } from './values';
import { freezeLabels } from './values';

function scalar(v: number | null): Scalar {
  return { kind: 'scalar', value: v };
}

function series(
  grid: number[],
  entries: Array<{ labels: Record<string, string>; name: string; values: Array<number | null> }>,
): SeriesSet {
  return {
    kind: 'series',
    grid,
    series: entries.map((e) => ({ ...e, ...freezeLabels(e.labels) })),
  };
}

const GRID = [0, 1000, 2000];

describe('applyUnary', () => {
  it('negates a scalar', () => {
    expect(applyUnary('-', scalar(3))).toEqual(scalar(-3));
  });

  it('not returns 0 for non-zero, 1 for 0', () => {
    expect(applyUnary('not', scalar(5))).toEqual(scalar(0));
    expect(applyUnary('not', scalar(0))).toEqual(scalar(1));
  });

  it('propagates null for arithmetic negation', () => {
    expect(applyUnary('-', scalar(null))).toEqual(scalar(null));
    expect(applyUnary('+', scalar(null))).toEqual(scalar(null));
  });

  it('not treats null as absent (falsy), returning 1', () => {
    expect(applyUnary('not', scalar(null))).toEqual(scalar(1));
  });

  it('works element-wise on series', () => {
    const s = series(GRID, [{ name: 'n', labels: {}, values: [1, -2, null] }]);
    const out = applyUnary('-', s) as SeriesSet;
    expect(out.series[0]?.values).toEqual([-1, 2, null]);
  });
});

describe('applyBinary — scalar × scalar', () => {
  it.each([
    ['+', 3, 4, 7],
    ['-', 10, 3, 7],
    ['*', 3, 4, 12],
    ['/', 10, 2, 5],
    ['%', 10, 3, 1],
    ['^', 2, 8, 256],
  ] as const)('%s: %d %s %d = %d', (op, a, b, expected) => {
    expect(applyBinary(op, scalar(a), scalar(b))).toEqual(scalar(expected));
  });

  it('/ 0 gives Infinity', () => {
    expect((applyBinary('/', scalar(1), scalar(0)) as Scalar).value).toBe(Infinity);
  });

  it('0 / 0 gives NaN', () => {
    expect((applyBinary('/', scalar(0), scalar(0)) as Scalar).value).toBeNaN();
  });

  it('null propagates through arithmetic only', () => {
    expect(applyBinary('+', scalar(null), scalar(1))).toEqual(scalar(null));
    expect(applyBinary('+', scalar(1), scalar(null))).toEqual(scalar(null));
    expect(applyBinary('-', scalar(null), scalar(1))).toEqual(scalar(null));
    expect(applyBinary('*', scalar(1), scalar(null))).toEqual(scalar(null));
    expect(applyBinary('/', scalar(null), scalar(2))).toEqual(scalar(null));
    expect(applyBinary('%', scalar(5), scalar(null))).toEqual(scalar(null));
    expect(applyBinary('^', scalar(null), scalar(2))).toEqual(scalar(null));
  });

  it('comparison operators return 1 or 0', () => {
    expect(applyBinary('==', scalar(5), scalar(5))).toEqual(scalar(1));
    expect(applyBinary('!=', scalar(5), scalar(5))).toEqual(scalar(0));
    expect(applyBinary('<', scalar(3), scalar(5))).toEqual(scalar(1));
    expect(applyBinary('>=', scalar(5), scalar(3))).toEqual(scalar(1));
  });

  it('comparison with a null operand is false (never null)', () => {
    // A missing sample cannot satisfy an ordering or an equality, so every comparison yields 0.
    for (const op of ['==', '!=', '<', '<=', '>', '>='] as const) {
      expect(applyBinary(op, scalar(null), scalar(5))).toEqual(scalar(0));
      expect(applyBinary(op, scalar(5), scalar(null))).toEqual(scalar(0));
      expect(applyBinary(op, scalar(null), scalar(null))).toEqual(scalar(0));
    }
  });

  it('logical and / or treat non-zero as true', () => {
    expect(applyBinary('and', scalar(2), scalar(3))).toEqual(scalar(1));
    expect(applyBinary('and', scalar(0), scalar(1))).toEqual(scalar(0));
    expect(applyBinary('or', scalar(0), scalar(0))).toEqual(scalar(0));
    expect(applyBinary('or', scalar(0), scalar(1))).toEqual(scalar(1));
  });

  it('logical operators treat null as absent (falsy), never null', () => {
    // and: a null operand is falsy, so the result is 0 regardless of the other side.
    expect(applyBinary('and', scalar(null), scalar(3))).toEqual(scalar(0));
    expect(applyBinary('and', scalar(3), scalar(null))).toEqual(scalar(0));
    expect(applyBinary('and', scalar(null), scalar(null))).toEqual(scalar(0));
    // or: a null operand contributes nothing, but a present non-zero side still wins.
    expect(applyBinary('or', scalar(null), scalar(1))).toEqual(scalar(1));
    expect(applyBinary('or', scalar(1), scalar(null))).toEqual(scalar(1));
    expect(applyBinary('or', scalar(null), scalar(0))).toEqual(scalar(0));
    expect(applyBinary('or', scalar(null), scalar(null))).toEqual(scalar(0));
  });
});

describe('applyBinary — scalar × series', () => {
  it('broadcasts scalar to every point', () => {
    const s = series(GRID, [{ name: 'n', labels: {}, values: [1, 2, null] }]);
    const out = applyBinary('*', scalar(3), s) as SeriesSet;
    expect(out.series[0]?.values).toEqual([3, 6, null]);
  });

  it('series × scalar keeps left side', () => {
    const s = series(GRID, [{ name: 'n', labels: {}, values: [4, 6, 8] }]);
    const out = applyBinary('/', s, scalar(2)) as SeriesSet;
    expect(out.series[0]?.values).toEqual([2, 3, 4]);
  });
});

describe('applyBinary — strict series matching', () => {
  it('pairs series with equal label sets', () => {
    const left = series(GRID, [{ name: 'l', labels: { job: 'a' }, values: [2, 4, 6] }]);
    const right = series(GRID, [{ name: 'r', labels: { job: 'a' }, values: [1, 2, 3] }]);
    const out = applyBinary('/', left, right) as SeriesSet;
    expect(out.series[0]?.values).toEqual([2, 2, 2]);
    expect(out.series[0]?.name).toBe('l'); // keeps left name
  });

  it('drops series with no matching pair', () => {
    const left = series(GRID, [
      { name: 'l1', labels: { job: 'a' }, values: [1, 1, 1] },
      { name: 'l2', labels: { job: 'b' }, values: [2, 2, 2] },
    ]);
    const right = series(GRID, [{ name: 'r1', labels: { job: 'a' }, values: [1, 1, 1] }]);
    const out = applyBinary('+', left, right) as SeriesSet;
    expect(out.series.length).toBe(1);
    expect(out.series[0]?.labels).toEqual(freezeLabels({ job: 'a' }).labels);
  });

  it('throws no_match when both sides are non-empty with no pair', () => {
    const left = series(GRID, [{ name: 'l', labels: { job: 'a' }, values: [1, 1, 1] }]);
    const right = series(GRID, [{ name: 'r', labels: { job: 'b' }, values: [1, 1, 1] }]);
    expect(() => applyBinary('+', left, right)).toThrow(ExpressionError);
    try {
      applyBinary('+', left, right);
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('no_match');
    }
  });

  it('throws no_match on duplicate label set', () => {
    const left = series(GRID, [
      { name: 'l1', labels: { job: 'a' }, values: [1, 1, 1] },
      { name: 'l2', labels: { job: 'a' }, values: [2, 2, 2] },
    ]);
    const right = series(GRID, [{ name: 'r', labels: { job: 'a' }, values: [1, 1, 1] }]);
    expect(() => applyBinary('+', left, right)).toThrow(ExpressionError);
    try {
      applyBinary('+', left, right);
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('no_match');
    }
  });

  it('matching is unaffected by __name__ (already stripped before this layer)', () => {
    const left = series(GRID, [{ name: 'x', labels: { job: 'a' }, values: [10, 10, 10] }]);
    const right = series(GRID, [{ name: 'y', labels: { job: 'a' }, values: [5, 5, 5] }]);
    const out = applyBinary('-', left, right) as SeriesSet;
    expect(out.series.length).toBe(1);
  });
});
