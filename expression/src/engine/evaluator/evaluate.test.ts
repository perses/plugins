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

import type { TimeSeriesData } from '@perses-dev/spec';

import { ExpressionError } from '../expression-error';
import { evaluateExpression } from '../index';
import type { EvaluationRequest, Limits } from '../types';
import { DEFAULT_LIMITS } from './limits';

function ts(values: Array<[number, number | null]>, labels: Record<string, string> = {}): TimeSeriesData {
  return {
    series: [{ name: 'x', labels, values }],
  };
}

function twoSeries(tag: string): TimeSeriesData {
  return {
    series: [
      { name: 'a', labels: { job: tag, instance: '0' }, values: [[0, 1]] as Array<[number, number]> },
      { name: 'b', labels: { job: tag, instance: '1' }, values: [[0, 2]] as Array<[number, number]> },
    ],
  };
}

function req(
  expr: string,
  inputs: Record<number, TimeSeriesData>,
  overrides: Omit<Partial<EvaluationRequest>, 'limits'> = {},
): EvaluationRequest {
  return {
    expression: expr,
    inputs,
    startMs: 0,
    endMs: 60000,
    ...overrides,
  };
}

function withLimits(limits: Partial<Limits>): Limits {
  return { ...DEFAULT_LIMITS, ...limits };
}

describe('evaluateExpression', () => {
  it('evaluates a scalar expression', () => {
    const result = evaluateExpression(req('2 + 3', {}));
    expect(result.series[0]?.name).toBe('expression');
    // 5 at every grid point
    for (const [, v] of result.series[0]?.values ?? []) {
      expect(v).toBe(5);
    }
  });

  it('grids a scalar expression across the range using stepMs, ending exactly at endMs', () => {
    const result = evaluateExpression(req('42', {}, { startMs: 0, endMs: 60000, stepMs: 15000 }));
    const times = result.series[0]?.values.map(([t]) => t);
    expect(times).toEqual([0, 15000, 30000, 45000, 60000]);
    expect(result.series[0]?.values.every(([, v]) => v === 42)).toBe(true);
    expect(result.stepMs).toBe(15000);
  });

  it('falls back to two endpoints for a scalar when no stepMs is given', () => {
    const result = evaluateExpression(req('42', {}, { startMs: 0, endMs: 60000 }));
    expect(result.series[0]?.values).toEqual([
      [0, 42],
      [60000, 42],
    ]);
  });

  it('evaluates $1 * 2 on a series', () => {
    const result = evaluateExpression(
      req('$1 * 2', {
        0: ts([
          [0, 1],
          [15000, 2],
          [30000, 3],
          [45000, 4],
        ]),
      }),
    );
    // grid is the union of input timestamps: [0, 15000, 30000, 45000]
    expect(result.series[0]?.values.map(([, v]) => v)).toEqual([2, 4, 6, 8]);
  });

  it('evaluates $1 / $2 on two series with equal labels', () => {
    const labels = { job: 'app' };
    const result = evaluateExpression(
      req('$1 / $2', {
        0: ts(
          [
            [0, 10],
            [15000, 20],
            [30000, 30],
            [45000, 40],
          ],
          labels,
        ),
        1: ts(
          [
            [0, 2],
            [15000, 4],
            [30000, 6],
            [45000, 8],
          ],
          labels,
        ),
      }),
    );
    // both inputs share the same 4 timestamps → grid [0, 15000, 30000, 45000]
    expect(result.series[0]?.values.map(([, v]) => v)).toEqual([5, 5, 5, 5]);
  });

  it('names series as {k="v"} when they have labels', () => {
    const result = evaluateExpression(
      req('$1 + 0', {
        0: ts([[0, 1]], { instance: 'host1' }),
      }),
    );
    expect(result.series[0]?.name).toBe('{instance="host1"}');
  });

  it('uses original name when series has no labels', () => {
    const result = evaluateExpression(
      req('$1 + 0', {
        0: ts([[0, 1]]),
      }),
    );
    expect(result.series[0]?.name).toBe('x');
  });

  it('throws unknown_reference for a missing input', () => {
    expect(() => evaluateExpression(req('$5 + 1', {}))).toThrow(ExpressionError);
    try {
      evaluateExpression(req('$5 + 1', {}));
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('unknown_reference');
    }
  });

  it('throws syntax error for a bad expression', () => {
    expect(() => evaluateExpression(req('$1 + ', { 0: ts([[0, 1]]) }))).toThrow(ExpressionError);
  });

  it('throws syntax error when nesting exceeds the depth limit', () => {
    // A long chain of parentheses nests one AST level per pair, well past MAX_DEPTH (64) but within
    // the character limit, so it exercises the depth guard rather than the length guard.
    const deep = '('.repeat(100) + '1' + ')'.repeat(100);
    try {
      evaluateExpression(req(deep, {}));
      throw new Error('expected a depth error');
    } catch (e) {
      expect(e).toBeInstanceOf(ExpressionError);
      expect((e as ExpressionError).info.code).toBe('syntax');
      expect((e as ExpressionError).info.message).toMatch(/nests deeper/);
    }
  });

  it('throws unknown_function for an unknown function', () => {
    expect(() => evaluateExpression(req('bogus($1)', { 0: ts([[0, 1]]) }))).toThrow(ExpressionError);
    try {
      evaluateExpression(req('bogus($1)', { 0: ts([[0, 1]]) }));
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('unknown_function');
    }
  });

  it('respects an AbortSignal', () => {
    const controller = new AbortController();
    controller.abort();
    expect(() => evaluateExpression(req('$1 + $1', { 0: ts([[0, 1]]) }), controller.signal)).toThrow(ExpressionError);
    try {
      evaluateExpression(req('$1 + $1', { 0: ts([[0, 1]]) }), controller.signal);
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('aborted');
    }
  });

  it('throws limit_exceeded when maxSeries is exceeded', () => {
    const manySeriesInput: TimeSeriesData = {
      series: Array.from({ length: 5 }, (_, i) => ({
        name: `s${i}`,
        labels: { instance: String(i) },
        values: [[0, i]] as Array<[number, number]>,
      })),
    };
    expect(() =>
      evaluateExpression(req('$1 + 0', { 0: manySeriesInput }), undefined, withLimits({ maxSeries: 3 })),
    ).toThrow(ExpressionError);
    try {
      evaluateExpression(req('$1 + 0', { 0: manySeriesInput }), undefined, withLimits({ maxSeries: 3 }));
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('limit_exceeded');
    }
  });

  it('sets timeRange, stepMs and metadata on the result', () => {
    const result = evaluateExpression(req('1 + 1', {}));
    expect(result.timeRange).toEqual({ start: new Date(0), end: new Date(60000) });
    // pure scalar: flat line spanning the request range, so stepMs is the full span
    expect(result.stepMs).toBe(60000);
    expect(result.series[0]?.values).toEqual([
      [0, 2],
      [60000, 2],
    ]);
  });

  it('applies abs() correctly', () => {
    const result = evaluateExpression(
      req('abs($1)', {
        0: ts([
          [0, -5],
          [15000, 3],
        ]),
      }),
    );
    expect(result.series[0]?.values[0]?.[1]).toBe(5);
    expect(result.series[0]?.values[1]?.[1]).toBe(3);
  });

  it('does not call DEFAULT_LIMITS.maxSeries when using custom limits', () => {
    const result = evaluateExpression(
      req('$1 + 0', { 0: ts([[0, 1]], { job: 'a' }) }),
      undefined,
      withLimits({ maxSeries: DEFAULT_LIMITS.maxSeries }),
    );
    expect(result.series.length).toBe(1);
  });

  it('keeps the union of timestamps when inputs have different stepMs', () => {
    // $1 has points every 15s, $2 every 30s. The grid is the union of all timestamps:
    // [0, 15000, 30000, 45000, 60000]. $2 has no sample at 15000/45000, so the division is
    // null there (the finer input's extra points are preserved, not downsampled away).
    const input1: TimeSeriesData = {
      stepMs: 15000,
      series: [
        {
          name: 'a',
          labels: { job: 'x' },
          values: [
            [0, 10],
            [15000, 20],
            [30000, 30],
            [45000, 40],
            [60000, 50],
          ],
        },
      ],
    };
    const input2: TimeSeriesData = {
      stepMs: 30000,
      series: [
        {
          name: 'b',
          labels: { job: 'x' },
          values: [
            [0, 5],
            [30000, 10],
            [60000, 15],
          ],
        },
      ],
    };
    const result = evaluateExpression(req('$1 / $2', { 0: input1, 1: input2 }));
    expect(result.series[0]?.values.map(([, v]) => v)).toEqual([2, null, 3, null, 10 / 3]);
  });

  it('comparison and logical operators yield defined 1/0 on grid points where an input is absent', () => {
    const labels = { job: 'x' };
    const one = ts(
      [
        [0, 5],
        [30000, 5],
      ],
      labels,
    );
    const two = ts(
      [
        [0, 5],
        [15000, 9],
      ],
      labels,
    );
    const eq = evaluateExpression(req('$1 == $2', { 0: one, 1: two }));
    // 0: 5==5 → 1; 15000: null==9 → 0; 30000: 5==null → 0.
    expect(eq.series[0]?.values.map(([, v]) => v)).toEqual([1, 0, 0]);

    const or = evaluateExpression(req('$1 or $2', { 0: one, 1: two }));
    // Every grid point has a present non-zero sample on at least one side.
    expect(or.series[0]?.values.map(([, v]) => v)).toEqual([1, 1, 1]);

    const and = evaluateExpression(req('$1 and $2', { 0: one, 1: two }));
    // Only timestamp 0 has both sides present and non-zero.
    expect(and.series[0]?.values.map(([, v]) => v)).toEqual([1, 0, 0]);
  });

  it('output stepMs is the smallest gap between grid points', () => {
    const input: TimeSeriesData = {
      stepMs: 15000,
      series: [
        {
          name: 'x',
          labels: {},
          values: [
            [0, 1],
            [15000, 2],
            [45000, 3],
          ],
        },
      ],
    };
    const result = evaluateExpression(req('$1 * 1', { 0: input }));
    expect(result.stepMs).toBe(15000);
  });

  it('output stepMs falls back to the input stepMs for a single-point input', () => {
    const input: TimeSeriesData = { stepMs: 60000, series: [{ name: 'x', labels: {}, values: [[0, 1]] }] };
    const result = evaluateExpression(req('$1 * 1', { 0: input }));
    expect(result.stepMs).toBe(60000);
  });

  it('throws limit_exceeded when the grid exceeds maxPointsPerSeries', () => {
    // 11 distinct timestamps in the union grid, limit=10
    const values: Array<[number, number]> = Array.from({ length: 11 }, (_, i) => [i * 1000, i]);
    const input: TimeSeriesData = { series: [{ name: 'x', labels: {}, values }] };
    expect(() =>
      evaluateExpression(req('$1', { 0: input }), undefined, withLimits({ maxPointsPerSeries: 10 })),
    ).toThrow(ExpressionError);
    try {
      evaluateExpression(req('$1', { 0: input }), undefined, withLimits({ maxPointsPerSeries: 10 }));
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('limit_exceeded');
    }
  });

  it('throws limit_exceeded when maxSamples would be exceeded during operations', () => {
    // 1 series × 5 grid points, budget limit=3 → charged 5 during align, already over
    const input: TimeSeriesData = {
      series: [
        {
          name: 'x',
          labels: {},
          values: [
            [0, 1],
            [15000, 2],
            [30000, 3],
            [45000, 4],
            [60000, 5],
          ],
        },
      ],
    };
    expect(() => evaluateExpression(req('$1 + 1', { 0: input }), undefined, withLimits({ maxSamples: 3 }))).toThrow(
      ExpressionError,
    );
  });

  it('aborts during alignment when signal is already aborted', () => {
    const controller = new AbortController();
    // Pre-abort, so the signal fires during the per-series alignment loop
    controller.abort();
    const manySeriesInput: TimeSeriesData = {
      series: [
        { name: 's0', labels: { job: 'a' }, values: [[0, 1]] },
        { name: 's1', labels: { job: 'b' }, values: [[0, 2]] },
      ],
    };
    expect(() => evaluateExpression(req('$1 * 1', { 0: manySeriesInput }), controller.signal)).toThrow(ExpressionError);
    try {
      evaluateExpression(req('$1 * 1', { 0: manySeriesInput }), controller.signal);
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('aborted');
    }
  });

  it('escapes double-quotes in label values in the series name', () => {
    const result = evaluateExpression(
      req('$1 + 0', {
        0: ts([[0, 1]], { label: 'val"ue' }),
      }),
    );
    expect(result.series[0]?.name).toBe('{label="val\\"ue"}');
  });

  it('throws limit_exceeded when maxSeries is exceeded across two inputs combined', () => {
    // $1 has 2 series, $2 has 2 series → total 4 > limit 3
    expect(() =>
      evaluateExpression(
        req('$1 + $2', { 0: twoSeries('a'), 1: twoSeries('b') }),
        undefined,
        withLimits({ maxSeries: 3 }),
      ),
    ).toThrow(ExpressionError);
    try {
      evaluateExpression(
        req('$1 + $2', { 0: twoSeries('a'), 1: twoSeries('b') }),
        undefined,
        withLimits({ maxSeries: 3 }),
      );
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('limit_exceeded');
    }
  });

  it('produces no_match when __name__ collision strips labels to duplicates', () => {
    // {__name__="a", job="x"} and {__name__="b", job="x"} → both become {job="x"} → duplicate → no_match
    const input: TimeSeriesData = {
      series: [
        { name: 'a', labels: { __name__: 'a', job: 'x' }, values: [[0, 1]] as Array<[number, number]> },
        { name: 'b', labels: { __name__: 'b', job: 'x' }, values: [[0, 2]] as Array<[number, number]> },
      ],
    };
    expect(() => evaluateExpression(req('$1 + $1', { 0: input }))).toThrow(ExpressionError);
    try {
      evaluateExpression(req('$1 + $1', { 0: input }));
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('no_match');
    }
  });

  it('single-point (instant-shaped) input yields a single-point output at the input timestamp', () => {
    // An instant query produces one point per series. The grid is just that timestamp, so the
    // output is a single point there — not a multi-point, mostly-null range grid.
    const input: TimeSeriesData = { series: [{ name: 'x', labels: {}, values: [[55000, 7]] }] };
    const result = evaluateExpression(req('$1', { 0: input }, { startMs: 0, endMs: 60000 }));
    expect(result.series[0]?.values).toHaveLength(1);
    expect(result.series[0]?.values[0]?.[0]).toBe(55000);
    expect(result.series[0]?.values[0]?.[1]).toBe(7);
  });
});

// 1 series × N grid points. Each stage (align, operator, function) charges series × grid.
// maxSamples is used as an observable: set it to exactly the expected total to confirm the count,
// or one below to confirm the charge happens at all.
describe('budget accounting', () => {
  // Input: 1 series, 4 grid points → align charges 4.
  const input4pts: TimeSeriesData = {
    series: [
      {
        name: 'x',
        labels: {},
        values: [
          [0, 1],
          [1000, 2],
          [2000, 3],
          [3000, 4],
        ] as Array<[number, number]>,
      },
    ],
  };

  it('charges 4 samples for aligning 1 series × 4 grid points', () => {
    // Exactly 4 allowed → succeeds.
    expect(() =>
      evaluateExpression(req('$1', { 0: input4pts }), undefined, withLimits({ maxSamples: 4 })),
    ).not.toThrow();
    // One fewer → fails during align.
    expect(() => evaluateExpression(req('$1', { 0: input4pts }), undefined, withLimits({ maxSamples: 3 }))).toThrow(
      ExpressionError,
    );
  });

  it('does not double-charge when the same input is referenced twice', () => {
    // $1 + $1: align charges 4 once (cached), binary op charges 4 → total 8.
    expect(() =>
      evaluateExpression(req('$1 + $1', { 0: input4pts }), undefined, withLimits({ maxSamples: 8 })),
    ).not.toThrow();
    expect(() =>
      evaluateExpression(req('$1 + $1', { 0: input4pts }), undefined, withLimits({ maxSamples: 7 })),
    ).toThrow(ExpressionError);
  });

  it('charges for operator output on top of align', () => {
    // $1 * 2: align charges 4, scalar×series binary op charges 4 → total 8.
    expect(() =>
      evaluateExpression(req('$1 * 2', { 0: input4pts }), undefined, withLimits({ maxSamples: 8 })),
    ).not.toThrow();
    expect(() => evaluateExpression(req('$1 * 2', { 0: input4pts }), undefined, withLimits({ maxSamples: 7 }))).toThrow(
      ExpressionError,
    );
  });

  it('charges for function output on top of align', () => {
    // abs($1): align charges 4, function charges 4 → total 8.
    expect(() =>
      evaluateExpression(req('abs($1)', { 0: input4pts }), undefined, withLimits({ maxSamples: 8 })),
    ).not.toThrow();
    expect(() =>
      evaluateExpression(req('abs($1)', { 0: input4pts }), undefined, withLimits({ maxSamples: 7 })),
    ).toThrow(ExpressionError);
  });

  it('charges for unary operator output on top of align', () => {
    // -$1: align charges 4, unary op charges 4 → total 8.
    expect(() =>
      evaluateExpression(req('-$1', { 0: input4pts }), undefined, withLimits({ maxSamples: 8 })),
    ).not.toThrow();
    expect(() => evaluateExpression(req('-$1', { 0: input4pts }), undefined, withLimits({ maxSamples: 7 }))).toThrow(
      ExpressionError,
    );
  });

  it('accumulates charges across chained operations', () => {
    // abs($1 * 2): align 4, binary 4, function 4 → total 12.
    expect(() =>
      evaluateExpression(req('abs($1 * 2)', { 0: input4pts }), undefined, withLimits({ maxSamples: 12 })),
    ).not.toThrow();
    expect(() =>
      evaluateExpression(req('abs($1 * 2)', { 0: input4pts }), undefined, withLimits({ maxSamples: 11 })),
    ).toThrow(ExpressionError);
  });

  it('charges each input align independently for two different inputs', () => {
    // $1 + $2 with matching labels: align $1 (4) + align $2 (4) + binary (4) → total 12.
    const input2: TimeSeriesData = {
      series: [
        {
          name: 'x',
          labels: {},
          values: [
            [0, 10],
            [1000, 20],
            [2000, 30],
            [3000, 40],
          ] as Array<[number, number]>,
        },
      ],
    };
    expect(() =>
      evaluateExpression(req('$1 + $2', { 0: input4pts, 1: input2 }), undefined, withLimits({ maxSamples: 12 })),
    ).not.toThrow();
    expect(() =>
      evaluateExpression(req('$1 + $2', { 0: input4pts, 1: input2 }), undefined, withLimits({ maxSamples: 11 })),
    ).toThrow(ExpressionError);
  });
});
