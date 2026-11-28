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

import type { TimeSeriesExpressionQueryContext } from '@perses-dev/plugin-system';
import type { TimeSeriesData } from '@perses-dev/spec';

import { ExpressionError } from './engine';
import { getExpressionInputs } from './expression-query-types';
import { TimeSeriesExpressionQuery } from './ExpressionQuery';
import { buildEvaluationRequest, getExpressionData } from './get-expression-data';

const dataA: TimeSeriesData = {
  series: [{ name: 'a', labels: {}, values: [[1000, 1]] }],
};
const dataB: TimeSeriesData = {
  series: [{ name: 'b', labels: {}, values: [[1000, 2]] }],
};

function makeContext(inputs?: Record<number, TimeSeriesData>): TimeSeriesExpressionQueryContext {
  return {
    timeRange: { start: new Date(1000), end: new Date(61000) },
    suggestedStepMs: 15000,
    mode: 'range',
    inputs: inputs ?? {},
    variableState: {},
    datasourceStore: {} as TimeSeriesExpressionQueryContext['datasourceStore'],
  };
}

describe('getExpressionInputs', () => {
  it('extracts 0-based query indexes from a math expression', () => {
    expect(getExpressionInputs({ type: 'math', expression: '$1 / $2 * 100 + $1 + $3' })).toEqual([0, 1, 2]);
  });

  it('returns [] for blank expression', () => {
    expect(getExpressionInputs({ type: 'math', expression: '' })).toEqual([]);
    expect(getExpressionInputs({ type: 'math', expression: '  ' })).toEqual([]);
  });

  it('returns [] for unparseable expression (error surfaces at evaluation)', () => {
    expect(getExpressionInputs({ type: 'math', expression: '$1 +' })).toEqual([]);
  });

  it('is used as query dependencies', () => {
    expect(TimeSeriesExpressionQuery.dependsOn?.({ type: 'math', expression: '$1 + $2' }, makeContext())).toEqual({
      queries: [0, 1],
    });
  });
});

describe('buildEvaluationRequest', () => {
  it('passes inputs through as-is; the engine reports unknown_reference errors', () => {
    const inputs = { 0: dataA, 1: dataB };
    const req = buildEvaluationRequest({ type: 'math', expression: '$1 * 2' }, makeContext(inputs));
    expect(req.inputs).toBe(inputs);
    expect(req.startMs).toBe(1000);
    expect(req.endMs).toBe(61000);
    expect(req.stepMs).toBe(15000);
    expect(req.expression).toBe('$1 * 2');
  });
});

describe('getExpressionData', () => {
  it('returns empty series for a blank math expression', async () => {
    expect(await getExpressionData({ type: 'math', expression: ' ' }, makeContext())).toEqual({ series: [] });
  });

  it('evaluates expression and sets executedQueryString', async () => {
    const out = await getExpressionData({ type: 'math', expression: '$1 * 2' }, makeContext({ 0: dataA }));
    expect(out.series[0]?.values).toEqual([[1000, 2]]);
    expect(out.metadata?.executedQueryString).toBe('$1 * 2');
    expect(out.timeRange).toEqual({ start: new Date(1000), end: new Date(61000) });
  });

  it('uses the real in-thread evaluator for a smoke test', async () => {
    const result = await getExpressionData({ type: 'math', expression: '$1 * 2' }, makeContext({ 0: dataA }));
    // dataA is a single-point (instant-shaped) input → single-point output at the same timestamp
    expect(result.series[0]?.values).toEqual([[1000, 2]]);
    expect(result.metadata?.executedQueryString).toBe('$1 * 2');
  });

  it('propagates errors from the evaluator', async () => {
    await expect(getExpressionData({ type: 'math', expression: '$1 +' }, makeContext({ 0: dataA }))).rejects.toThrow(
      ExpressionError,
    );
  });
});
