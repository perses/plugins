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

import { DEFAULT_LIMITS, evaluateNode } from './evaluator';
import { SampleBudget } from './evaluator/limits';
import type { ExpressionErrorInfo } from './expression-error';
import { ExpressionError } from './expression-error';
import { createParseCache } from './parser';
import type { EvaluationRequest, Limits } from './types';

export type { ExpressionErrorInfo, EvaluationRequest };
export { ExpressionError, DEFAULT_LIMITS };

export type ParseResult = { ok: true; references: readonly number[] } | { ok: false; error: ExpressionErrorInfo };

export { type ErrorCode } from './expression-error';
export { type Limits } from './types';

export { FUNCTION_NAMES } from './evaluator';

const cachedParse = createParseCache(128);

/**
 * Parses `source` and returns either the extracted query references (0-based indexes) or an
 * {@link ExpressionErrorInfo} describing the syntax problem.
 * Results are memoized in a module-level LRU cache so repeated calls from the editor are cheap.
 */
export function parseExpression(source: string): ParseResult {
  const result = cachedParse(source);
  if (result.ok) {
    return { ok: true, references: result.references };
  }
  return { ok: false, error: result.error };
}

/**
 * Synchronously evaluates a math expression against the provided inputs and returns
 * {@link TimeSeriesData}. Parses from the shared LRU cache; throws {@link ExpressionError} on
 * syntax errors or evaluation failures (unknown reference, limit exceeded, etc.).
 */
export function evaluateExpression(
  request: EvaluationRequest,
  signal?: AbortSignal,
  limits: Limits = DEFAULT_LIMITS,
): TimeSeriesData {
  const result = cachedParse(request.expression);
  if (!result.ok) {
    throw new ExpressionError(result.error);
  }
  return evaluateNode(result.node, request, new SampleBudget(limits), signal);
}
