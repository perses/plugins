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

import { parseExpression } from './engine';

/**
 * The type of operation done by an expression. Only `math` is available for now.
 * To add a new type: extend this union and ExpressionQuerySpec, add it to EXPRESSION_TYPES, getExpressionInputs and
 * the editor, and add it to the CUE schema.
 */
export type ExpressionType = 'math';

/**
 * Spec of the ExpressionQuery plugin. The fields used depend on the type of the expression.
 * Other queries of the panel are referenced by their 1-based position: $1, $2, $3...
 */
export interface ExpressionQuerySpec {
  type: ExpressionType;
  /** math: e.g. "$1 / $2 * 100". Reference the other queries by their position with $1, $2... */
  expression?: string;
  /** Optional legend format using {{label_name}} interpolation, e.g. "{{instance}}" */
  seriesNameFormat?: string;
}

export const EXPRESSION_TYPES: Array<{ value: ExpressionType; label: string; description: string }> = [
  {
    value: 'math',
    label: 'Math',
    description: 'Free-form math formula on time series, e.g. $1 / $2 * 100',
  },
];

/** Returns a blank {@link ExpressionQuerySpec} suitable as a default when adding a new query. */
export function createInitialExpressionQuerySpec(): ExpressionQuerySpec {
  return { type: 'math', expression: '' };
}

/**
 * Returns the sorted, unique 0-based indexes of the queries referenced by the expression.
 * Uses the engine parser so references are extracted exactly as the evaluator sees them.
 * Returns [] if the expression is blank or fails to parse (the error surfaces at evaluation time).
 */
export function getExpressionInputs(spec: ExpressionQuerySpec): number[] {
  const expr = spec.expression ?? '';
  if (!expr.trim()) {
    return [];
  }
  const result = parseExpression(expr);
  return result.ok ? [...result.references] : [];
}
