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
import type { AlignRequest } from './align';
import { alignInput, buildSharedGrid } from './align';
import { DEFAULT_LIMITS } from './limits';

function input(values: Array<[number, number | null]>, stepMs?: number): TimeSeriesData {
  return {
    stepMs,
    series: [{ name: 's', labels: {}, values }],
  };
}

const GRID = [1000, 16000, 31000, 46000];

function makeReq(grid: number[], overrides: Partial<AlignRequest> = {}): AlignRequest {
  return {
    grid,
    input: input([
      [1000, 1],
      [16000, 2],
      [31000, 3],
      [46000, 4],
    ]),
    ...overrides,
  };
}

describe('buildSharedGrid', () => {
  it('unions timestamps across inputs into a sorted grid', () => {
    const result = buildSharedGrid({
      inputs: [
        input([
          [0, 1],
          [30000, 2],
        ]),
        input([
          [15000, 3],
          [45000, 4],
        ]),
      ],
      maxPointsPerSeries: DEFAULT_LIMITS.maxPointsPerSeries,
    });
    expect(result.grid).toEqual([0, 15000, 30000, 45000]);
  });

  it('de-duplicates identical timestamps', () => {
    const result = buildSharedGrid({
      inputs: [
        input([
          [0, 1],
          [15000, 2],
        ]),
        input([
          [0, 3],
          [15000, 4],
        ]),
      ],
      maxPointsPerSeries: DEFAULT_LIMITS.maxPointsPerSeries,
    });
    expect(result.grid).toEqual([0, 15000]);
  });

  it('collapses a single-point (instant-shaped) input to a one-element grid', () => {
    const result = buildSharedGrid({
      inputs: [input([[55000, 7]])],
      maxPointsPerSeries: DEFAULT_LIMITS.maxPointsPerSeries,
    });
    expect(result.grid).toEqual([55000]);
  });

  it('returns an empty grid when there are no inputs', () => {
    const result = buildSharedGrid({ inputs: [], maxPointsPerSeries: DEFAULT_LIMITS.maxPointsPerSeries });
    expect(result.grid).toEqual([]);
    expect(result.stepMs).toBeUndefined();
  });

  it('derives stepMs as the smallest positive gap between grid points', () => {
    const result = buildSharedGrid({
      inputs: [
        input([
          [0, 1],
          [10000, 2],
          [40000, 3],
        ]),
      ],
      maxPointsPerSeries: DEFAULT_LIMITS.maxPointsPerSeries,
    });
    expect(result.stepMs).toBe(10000);
  });

  it('falls back to the largest input stepMs when the grid has fewer than two points', () => {
    const result = buildSharedGrid({
      inputs: [input([[1000, 1]], 60000)],
      maxPointsPerSeries: DEFAULT_LIMITS.maxPointsPerSeries,
    });
    expect(result.grid).toEqual([1000]);
    expect(result.stepMs).toBe(60000);
  });

  it('throws limit_exceeded when the union grid exceeds maxPointsPerSeries', () => {
    const values: Array<[number, number]> = Array.from({ length: 11 }, (_, i) => [i * 1000, i]);
    expect(() =>
      buildSharedGrid({
        inputs: [input(values)],
        maxPointsPerSeries: 10,
      }),
    ).toThrow(ExpressionError);
    try {
      buildSharedGrid({ inputs: [input(values)], maxPointsPerSeries: 10 });
    } catch (e) {
      expect((e as ExpressionError).info.code).toBe('limit_exceeded');
    }
  });
});

describe('alignInput', () => {
  it('maps samples onto grid points by exact timestamp', () => {
    const result = alignInput(makeReq(GRID));
    expect(result.series[0]?.values).toEqual([1, 2, 3, 4]);
  });

  it('produces null at grid points the series has no sample for', () => {
    // grid has an extra point at 61000 that this input does not cover
    const result = alignInput(makeReq([...GRID, 61000]));
    expect(result.series[0]?.values).toEqual([1, 2, 3, 4, null]);
  });

  it('resolves duplicate timestamps last-wins', () => {
    const result = alignInput(
      makeReq([1000, 16000], {
        input: input([
          [1000, 1],
          [1000, 9],
          [16000, 2],
        ]),
      }),
    );
    expect(result.series[0]?.values).toEqual([9, 2]);
  });

  it('drops __name__ label', () => {
    const result = alignInput(
      makeReq(GRID, {
        input: {
          series: [{ name: 'n', labels: { __name__: 'foo', job: 'bar' }, values: [[1000, 1]] }],
        },
      }),
    );
    expect(Object.keys(result.series[0]?.labels ?? {})).not.toContain('__name__');
    expect(result.series[0]?.labels).toEqual({ job: 'bar' });
  });

  it('aligns correctly regardless of input sample order', () => {
    const result = alignInput(
      makeReq(GRID, {
        input: input([
          [46000, 4],
          [1000, 1],
          [31000, 3],
          [16000, 2],
        ]),
      }),
    );
    expect(result.series[0]?.values).toEqual([1, 2, 3, 4]);
  });
});
