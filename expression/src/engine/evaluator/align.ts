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
import type { Sample, Series } from './values';
import { freezeLabels } from './values';

const DROP_NAME = new Set(['__name__']);

export interface AlignRequest {
  /** Pre-built shared grid (timestamps in ms). */
  grid: number[];
  input: TimeSeriesData;
  signal?: AbortSignal;
}

export interface AlignedInput {
  series: Series[];
}

export interface SharedGridRequest {
  inputs: TimeSeriesData[];
  maxPointsPerSeries: number;
}

export interface SharedGrid {
  grid: number[];
  /**
   * A representative step for the output envelope (the smallest positive gap between adjacent grid
   * points), used only as a hint for the renderer's own re-gridding. `undefined` when the grid has
   * fewer than two points and no input advertises a `stepMs`.
   */
  stepMs?: number;
}

/**
 * Computes the shared timestamp grid for a set of inputs: the sorted, de-duplicated union of every
 * timestamp appearing in the referenced inputs. Range inputs sharing a step (epoch-aligned by their
 * datasource) pass through unchanged; instant inputs collapse to a single point; mixed-step inputs
 * keep every timestamp. Throws {@link ExpressionError} with `limit_exceeded` if the de-duplicated
 * grid would exceed `maxPointsPerSeries`.
 */
export function buildSharedGrid(req: SharedGridRequest): SharedGrid {
  const { inputs, maxPointsPerSeries } = req;

  const timestamps = new Set<number>();
  for (const input of inputs) {
    for (const s of input.series) {
      for (const [ts] of s.values) {
        timestamps.add(ts);
      }
    }
  }

  const grid = [...timestamps].toSorted((a, b) => a - b);

  if (grid.length > maxPointsPerSeries) {
    throw new ExpressionError({
      code: 'limit_exceeded',
      message: `grid would have ${grid.length} points, max is ${maxPointsPerSeries}`,
    });
  }

  return { grid, stepMs: gridStepMs(grid, inputs) };
}

/**
 * Re-samples a single `TimeSeriesData` input onto the pre-built shared grid by exact timestamp
 * membership. Each grid point gets the sample sitting on it, or `null` when the series has no
 * sample at that timestamp. Duplicate timestamps within a series resolve last-wins. The `__name__`
 * label is stripped from every series. Throws {@link ExpressionError} with `aborted` when the
 * signal fires mid-loop.
 */
export function alignInput(req: AlignRequest): AlignedInput {
  const { grid, input, signal } = req;

  const series: Series[] = [];
  for (const s of input.series) {
    if (signal?.aborted) {
      throw new ExpressionError({ code: 'aborted', message: 'evaluation was aborted' });
    }

    const { labels, key } = freezeLabels(s.labels ?? {}, DROP_NAME);

    const byTs = new Map<number, Sample>();
    for (const [ts, value] of s.values) {
      byTs.set(ts, value);
    }

    const values: Sample[] = grid.map((gridPoint) => byTs.get(gridPoint) ?? null);

    series.push({ name: s.name, labels, key, values });
  }

  return { series };
}

/**
 * Derives a representative step for the output envelope: the smallest positive gap between adjacent
 * grid points, falling back to the largest input `stepMs` when the grid is too small to measure.
 */
function gridStepMs(grid: number[], inputs: TimeSeriesData[]): number | undefined {
  let minGap: number | undefined;
  for (let i = 1; i < grid.length; i++) {
    const gap = grid[i]! - grid[i - 1]!;
    if (gap > 0 && (minGap === undefined || gap < minGap)) {
      minGap = gap;
    }
  }
  if (minGap !== undefined) {
    return minGap;
  }

  let maxInputStep: number | undefined;
  for (const { stepMs } of inputs) {
    if (stepMs && (maxInputStep === undefined || stepMs > maxInputStep)) {
      maxInputStep = stepMs;
    }
  }
  return maxInputStep;
}
