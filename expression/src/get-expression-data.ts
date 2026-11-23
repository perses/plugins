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

import type { ExpressionQueryContext } from '@perses-dev/plugin-system';
import type { TimeSeriesData } from '@perses-dev/spec';

import type { EvaluationRequest } from './engine';
import { evaluateExpression } from './engine';
import type { ExpressionQuerySpec } from './expression-query-types';

function formatSeriesName(format: string, labels: Record<string, string>): string {
  return format.replace(/\{\{\s*(.+?)\s*\}\}/g, (_match, token) => labels[token] ?? '');
}

/** Constructs an {@link EvaluationRequest} from a plugin spec and its execution context. */
export function buildEvaluationRequest(spec: ExpressionQuerySpec, ctx: ExpressionQueryContext): EvaluationRequest {
  return {
    expression: spec.expression ?? '',
    inputs: ctx.inputs,
    startMs: ctx.timeRange.start.getTime(),
    endMs: ctx.timeRange.end.getTime(),
    stepMs: ctx.suggestedStepMs,
  };
}

/**
 * Evaluates the expression entirely in the browser.
 * The inputs are the results of other time series queries of the panel, already fetched by their own plugin.
 */
export async function getExpressionData(
  spec: ExpressionQuerySpec,
  context: ExpressionQueryContext,
  abortSignal?: AbortSignal,
): Promise<TimeSeriesData> {
  if (!spec.expression?.trim()) {
    return { series: [] };
  }

  const request = buildEvaluationRequest(spec, context);
  const data = evaluateExpression(request, abortSignal);

  const seriesNameFormat = spec.seriesNameFormat;

  return {
    ...data,
    timeRange: context.timeRange,
    metadata: { ...data.metadata, executedQueryString: spec.expression },
    series: seriesNameFormat
      ? data.series.map((s) => ({
          ...s,
          formattedName: formatSeriesName(seriesNameFormat, s.labels ?? {}),
        }))
      : data.series,
  };
}
