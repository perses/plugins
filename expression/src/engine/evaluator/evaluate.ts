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

import type { TimeSeriesData, TimeSeriesValueTuple } from '@perses-dev/spec';
import type { MathNode } from 'mathjs';

import { ExpressionError } from '../expression-error';
import { collectReferences } from '../parser';
import type { EvaluationRequest } from '../types';
import { buildSharedGrid } from './align';
import type { SampleBudget } from './limits';
import { BudgetedOperations } from './operations';
import { TreeWalker } from './tree-walker';
import type { Value } from './values';

/**
 * Walks the parsed mathjs expression tree and produces {@link TimeSeriesData}.
 *
 * Builds the shared grid once, aligns and caches each referenced input on first use, then
 * recursively evaluates operators and function calls. A scalar result is broadcast to a
 * single-series output spanning the full grid.
 */
export function evaluateNode(
  node: MathNode,
  request: EvaluationRequest,
  budget: SampleBudget,
  signal?: AbortSignal,
): TimeSeriesData {
  const { inputsMap, totalSeries } = collectInputs(node, request.inputs);
  budget.checkSeriesLimit(totalSeries);

  const { grid, stepMs } = buildSharedGrid({
    inputs: [...inputsMap.values()],
    maxPointsPerSeries: budget.maxPointsPerSeries,
  });

  const value = new TreeWalker({
    sharedGrid: grid,
    inputs: inputsMap,
    signal,
    operations: new BudgetedOperations(budget),
  }).walk(node);

  return formatOutput(value, grid, stepMs, request);
}

function formatOutput(
  value: Value,
  grid: number[],
  stepMs: number | undefined,
  request: EvaluationRequest,
): TimeSeriesData {
  const timeRange = { start: new Date(request.startMs), end: new Date(request.endMs) };

  if (value.kind === 'scalar') {
    const scalarGrid = grid.length > 0 ? grid : buildScalarGrid(request.startMs, request.endMs, request.stepMs);
    return {
      timeRange,
      stepMs: gridStepMs(scalarGrid, request.endMs - request.startMs),
      series: [
        { name: 'expression', values: scalarGrid.map((ts): TimeSeriesValueTuple => [ts, value.value]), labels: {} },
      ],
    };
  }

  return {
    timeRange,
    // Fall back to a measured/elapsed step when the shared grid was too small to advertise one, so
    // downstream re-gridding never receives stepMs: 0.
    stepMs: stepMs ?? gridStepMs(grid, request.endMs - request.startMs),
    series: value.series.map((s) => ({
      name: seriesName(s.labels, s.name),
      labels: { ...s.labels },
      values: grid.map((ts, i): TimeSeriesValueTuple => [ts, s.values[i] ?? null]),
    })),
  };
}

function escapeLabel(v: string): string {
  return v.replaceAll('\\', '\\\\').replaceAll('"', String.raw`\"`);
}

function gridStepMs(grid: number[], fallback: number): number {
  return grid.length > 1 ? grid[1]! - grid[0]! : fallback;
}

function seriesName(labels: Record<string, string>, fallback?: string): string {
  const entries = Object.entries(labels);
  if (entries.length > 0) {
    return '{' + entries.map(([k, v]) => `${escapeLabel(k)}="${escapeLabel(v)}"`).join(', ') + '}';
  }
  return fallback || 'expression';
}

/**
 * Builds an evenly-spaced grid `[startMs, startMs+step, …, endMs]` for a pure-scalar result.
 */
function buildScalarGrid(startMs: number, endMs: number, stepMs?: number): number[] {
  if (endMs <= startMs) {
    return [startMs];
  }
  const step = stepMs && stepMs > 0 ? stepMs : endMs - startMs;
  const grid: number[] = [];
  for (let ts = startMs; ts < endMs; ts += step) {
    grid.push(ts);
  }
  grid.push(endMs);
  return grid;
}

function collectInputs(
  node: MathNode,
  available: Record<number, TimeSeriesData>,
): { inputsMap: Map<number, TimeSeriesData>; totalSeries: number } {
  const inputsMap = new Map<number, TimeSeriesData>();
  for (const i of collectReferences(node)) {
    const input = available[i];
    if (input === undefined) {
      throw new ExpressionError({ code: 'unknown_reference', message: `query $${i + 1} is not available` });
    }
    inputsMap.set(i, input);
  }
  const totalSeries = [...inputsMap.values()].reduce((sum, inp) => sum + inp.series.length, 0);
  return { inputsMap, totalSeries };
}
