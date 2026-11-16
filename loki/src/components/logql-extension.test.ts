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

import { LRLanguage } from '@codemirror/language';

import { createLogQLExtension } from './logql-extension';

function hasSyntaxError(expr: string): boolean {
  const language = createLogQLExtension().find((extension): extension is LRLanguage => extension instanceof LRLanguage);
  if (language === undefined) {
    throw new Error('createLogQLExtension() should provide the LogQL language');
  }

  let hasError = false;
  language.parser.parse(expr).iterate({
    enter: (node) => {
      if (node.type.isError) {
        hasError = true;
      }
    },
  });
  return hasError;
}

describe('createLogQLExtension', () => {
  it.each([
    'sum by (level) (count_over_time({app="foo"} | logfmt [5m]))',
    // Approximate aggregations are supported by @grafana/lezer-logql >= 0.4.2.
    'approx_topk(3, sum by (job) (rate({job="api"}[5m])))',
    'approx_count_distinct(user, {job="api"} | json [5m]) by (pod)',
  ])('parses %s without syntax errors', (expr) => {
    expect(hasSyntaxError(expr)).toBe(false);
  });

  it('reports syntax errors in an incomplete query', () => {
    expect(hasSyntaxError('sum by (job) (')).toBe(true);
  });
});
