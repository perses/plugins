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
import { SampleBudget } from './limits';
import { BudgetedOperations } from './operations';
import type { Value } from './values';

const GRID = [0, 1000, 2000, 3000];

function seriesValue(values: Array<number | null>): Value {
  return {
    kind: 'series',
    grid: GRID,
    series: [{ name: 'x', labels: {}, key: '{}', values }],
  };
}

function scalarValue(n: number): Value {
  return { kind: 'scalar', value: n };
}

function input(values: Array<number | null>): TimeSeriesData {
  return {
    series: [
      { name: 'x', labels: {}, values: GRID.map((ts, i) => [ts, values[i] ?? null]) as Array<[number, number | null]> },
    ],
  };
}

function budget(maxSamples: number): SampleBudget {
  return new SampleBudget({ maxSeries: 1000, maxPointsPerSeries: 11000, maxSamples });
}

describe('BudgetedOperations', () => {
  describe('applyUnary', () => {
    it('returns the negated series', () => {
      const ops = new BudgetedOperations(budget(100));
      const result = ops.applyUnary('-', seriesValue([1, 2, 3, 4]));
      expect(result.kind).toBe('series');
      if (result.kind === 'series') {
        expect(result.series[0]?.values).toEqual([-1, -2, -3, -4]);
      }
    });

    it('does not charge for a scalar result', () => {
      const ops = new BudgetedOperations(budget(0));
      expect(() => ops.applyUnary('-', scalarValue(5))).not.toThrow();
    });

    it('charges series.length × grid.length samples', () => {
      // 1 series × 4 grid points = 4; budget of 3 should throw
      const ops = new BudgetedOperations(budget(3));
      expect(() => ops.applyUnary('-', seriesValue([1, 2, 3, 4]))).toThrow(ExpressionError);
    });
  });

  describe('applyBinary', () => {
    it('returns the element-wise sum', () => {
      const ops = new BudgetedOperations(budget(100));
      const result = ops.applyBinary('+', seriesValue([1, 2, 3, 4]), seriesValue([10, 20, 30, 40]));
      expect(result.kind).toBe('series');
      if (result.kind === 'series') {
        expect(result.series[0]?.values).toEqual([11, 22, 33, 44]);
      }
    });

    it('does not charge when both operands are scalars', () => {
      const ops = new BudgetedOperations(budget(0));
      const result = ops.applyBinary('+', scalarValue(1), scalarValue(2));
      expect(result).toEqual({ kind: 'scalar', value: 3 });
    });

    it('charges for series output', () => {
      const ops = new BudgetedOperations(budget(3));
      expect(() => ops.applyBinary('+', seriesValue([1, 2, 3, 4]), scalarValue(1))).toThrow(ExpressionError);
    });
  });

  describe('applyFunction', () => {
    it('applies abs() element-wise', () => {
      const ops = new BudgetedOperations(budget(100));
      const result = ops.applyFunction('abs', [seriesValue([-1, 2, -3, 4])]);
      expect(result.kind).toBe('series');
      if (result.kind === 'series') {
        expect(result.series[0]?.values).toEqual([1, 2, 3, 4]);
      }
    });

    it('does not charge for a scalar function result', () => {
      const ops = new BudgetedOperations(budget(0));
      expect(() => ops.applyFunction('abs', [scalarValue(-5)])).not.toThrow();
    });

    it('charges for series output', () => {
      const ops = new BudgetedOperations(budget(3));
      expect(() => ops.applyFunction('abs', [seriesValue([1, 2, 3, 4])])).toThrow(ExpressionError);
    });

    it('throws unknown_function for an unrecognised function name', () => {
      const ops = new BudgetedOperations(budget(100));
      expect(() => ops.applyFunction('bogus', [seriesValue([1])])).toThrow(ExpressionError);
      try {
        ops.applyFunction('bogus', [seriesValue([1])]);
      } catch (e) {
        expect((e as ExpressionError).info.code).toBe('unknown_function');
      }
    });
  });

  describe('resolve', () => {
    it('aligns and returns the series value', () => {
      const ops = new BudgetedOperations(budget(100));
      const inputs = new Map([[0, input([1, 2, 3, 4])]]);
      const result = ops.alignQueryInput(0, inputs, GRID, new Map());
      expect(result.kind).toBe('series');
      if (result.kind === 'series') {
        expect(result.series[0]?.values).toEqual([1, 2, 3, 4]);
      }
    });

    it('caches the result so a second call does not double-charge', () => {
      // Budget of exactly 4 — enough for one align but not two.
      const ops = new BudgetedOperations(budget(4));
      const inputs = new Map([[0, input([1, 2, 3, 4])]]);
      const cache = new Map<number, Value>();
      const first = ops.alignQueryInput(0, inputs, GRID, cache);
      // Second call hits cache, no additional charge.
      expect(() => ops.alignQueryInput(0, inputs, GRID, cache)).not.toThrow();
      const second = ops.alignQueryInput(0, inputs, GRID, cache);
      expect(second).toBe(first);
    });

    it('charges series.length × grid.length samples on first resolve', () => {
      const ops = new BudgetedOperations(budget(3));
      const inputs = new Map([[0, input([1, 2, 3, 4])]]);
      expect(() => ops.alignQueryInput(0, inputs, GRID, new Map())).toThrow(ExpressionError);
    });

    it('throws unknown_reference when the input index is missing', () => {
      const ops = new BudgetedOperations(budget(100));
      try {
        ops.alignQueryInput(5, new Map(), GRID, new Map());
      } catch (e) {
        expect((e as ExpressionError).info.code).toBe('unknown_reference');
      }
    });
  });
});
