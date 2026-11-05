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

import type { VariableStateMap } from '@perses-dev/plugin-system';
import { InterpolationFormat, interpolate, parseVariablesAndFormat, replaceVariables } from '@perses-dev/plugin-system';

import type { OpenSearchQueryLanguage } from './opensearch-log-query-types';

/**
 * Add the Perses builtin `__from` / `__to` (epoch milliseconds) to the variable state. Log
 * queries receive only user-defined variables, unlike time series queries, so without this
 * `$__from` would stay literal text. User-defined variables of the same name win.
 */
export function withTimeRangeVariables(variableState: VariableStateMap, start: Date, end: Date): VariableStateMap {
  return {
    __from: { value: start.valueOf().toString(), loading: false },
    __to: { value: end.valueOf().toString(), loading: false },
    ...variableState,
  };
}

/** Escape a string for use inside a JSON string literal, without the surrounding quotes. */
function escapeJsonString(value: string): string {
  return JSON.stringify(value).slice(1, -1);
}

/**
 * Same as Perses' `replaceVariables`, but with a language-specific default format for
 * multi-value variables, and a hook that post-processes each formatted value.
 */
function replaceVariablesWith(
  text: string,
  variableState: VariableStateMap,
  defaultListFormat: InterpolationFormat,
  finish: (formatted: string, format: InterpolationFormat | undefined) => string = (formatted) => formatted,
): string {
  const formats = parseVariablesAndFormat(text);
  let result = text;
  // Longest name first, so `$__range` can't replace the start of `$__range_ms`.
  for (const name of [...formats.keys()].toSorted((a, b) => b.length - a.length)) {
    const state = variableState[name];
    if (state === undefined) continue;
    const format = formats.get(name);
    const { value } = state;
    let formatted = '';
    if (Array.isArray(value)) {
      formatted = interpolate(value, name, format ?? defaultListFormat);
    } else if (typeof value === 'string') {
      formatted = interpolate([value], name, format ?? InterpolationFormat.RAW);
    }
    const replacement = finish(formatted, format);
    result = result
      .replaceAll(`$${name}`, replacement)
      .replaceAll(`\${${name}${format ? `:${format}` : ''}}`, replacement);
  }
  return result;
}

/**
 * Resolve variables in a query. A multi-value variable referenced without a format gets the
 * syntax its language understands, instead of Perses' default `(a|b)`:
 * - SQL: `'a','b'` (`sqlstring`), for `IN ($level)`.
 * - Lucene: `("a" OR "b")` (`lucene`).
 * - Query DSL: values are escaped as JSON string content after formatting, so a value (or the
 *   quotes a format such as `lucene` adds) can't break the JSON or add keys to the request.
 *   A `json` reference is left as the JSON it already is.
 * - PPL keeps Perses' standard behaviour, as before this plugin supported other languages.
 */
export function replaceQueryVariables(
  query: string,
  variableState: VariableStateMap,
  language: OpenSearchQueryLanguage,
): string {
  switch (language) {
    case 'sql':
      return replaceVariablesWith(query, variableState, InterpolationFormat.SQLSTRING);
    case 'lucene':
      return replaceVariablesWith(query, variableState, InterpolationFormat.LUCENE);
    case 'dsl':
      return replaceVariablesWith(query, variableState, InterpolationFormat.PROMETHEUS, (formatted, format) =>
        format === InterpolationFormat.JSON ? formatted : escapeJsonString(formatted),
      );
    case 'ppl':
      return replaceVariables(query, variableState);
  }
}

/**
 * Resolve variables in the index. A multi-value variable referenced without a format is
 * joined with commas, OpenSearch's multi-index syntax, instead of the default `(a|b)` that
 * the index check would reject.
 */
export function replaceIndexVariables(index: string, variableState: VariableStateMap): string {
  return replaceVariablesWith(index, variableState, InterpolationFormat.CSV);
}
