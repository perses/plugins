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

import { replaceIndexVariables, replaceQueryVariables } from './variables';

const state = (vars: Record<string, string | string[] | null>): VariableStateMap =>
  Object.fromEntries(Object.entries(vars).map(([name, value]) => [name, { value, loading: false }]));

describe('replaceQueryVariables', () => {
  const levels = state({ level: ['error', 'warn'] });

  it.each([
    ['sql', 'SELECT * FROM logs WHERE level IN ($level)', "SELECT * FROM logs WHERE level IN ('error','warn')"],
    ['lucene', 'level:$level', 'level:("error" OR "warn")'],
    ['ppl', "source=logs | where level='$level'", "source=logs | where level='(error|warn)'"],
  ] as const)('formats a multi-value variable for %s', (language, query, expected) => {
    expect(replaceQueryVariables(query, levels, language)).toBe(expected);
  });

  it('keeps an explicit format over the language default', () => {
    expect(replaceQueryVariables('level:${level:csv}', levels, 'lucene')).toBe('level:error,warn');
  });

  it('escapes single-value variables in SQL strings the same way as before', () => {
    expect(replaceQueryVariables("WHERE traceId = '$traceId'", state({ traceId: 'abc' }), 'sql')).toBe(
      "WHERE traceId = 'abc'",
    );
  });

  it.each([
    ['the lucene format', '{"query":{"query_string":{"query":"svc:${svc:lucene}"}}}', { svc: ['api', 'web'] }],
    ['the regex format', '{"regexp":{"host":"${host:regex}"}}', { host: 'a.b' }],
    ['a value with quotes and backslashes', '{"term":{"path":"$path"}}', { path: 'C:\\logs "x"' }],
  ])('keeps a DSL body valid JSON with %s', (_, query, vars) => {
    const resolved = replaceQueryVariables(query, state(vars), 'dsl');
    expect(() => JSON.parse(resolved)).not.toThrow();
  });

  it('puts the formatted value inside the DSL string, quotes included', () => {
    const resolved = replaceQueryVariables(
      '{"query":{"query_string":{"query":"svc:${svc:lucene}"}}}',
      state({ svc: ['api', 'web'] }),
      'dsl',
    );
    expect(JSON.parse(resolved).query.query_string.query).toBe('svc:("api" OR "web")');
  });

  it('leaves a json-formatted DSL reference as the JSON it emits', () => {
    expect(replaceQueryVariables('{"terms":{"level":${level:json}}}', levels, 'dsl')).toBe(
      '{"terms":{"level":["error","warn"]}}',
    );
  });

  it('replaces a null value with an empty string', () => {
    expect(replaceQueryVariables('level:$level', state({ level: null }), 'lucene')).toBe('level:');
  });

  it('replaces the longest variable name first', () => {
    expect(replaceQueryVariables('$__range_ms', state({ __range: '1h', __range_ms: '3600000' }), 'sql')).toBe(
      '3600000',
    );
  });
});

describe('replaceIndexVariables', () => {
  it('joins a multi-value index variable with commas', () => {
    expect(replaceIndexVariables('$index', state({ index: ['logs-a', 'logs-b'] }))).toBe('logs-a,logs-b');
  });

  it('keeps an explicit format', () => {
    expect(replaceIndexVariables('${index:pipe}', state({ index: ['logs-a', 'logs-b'] }))).toBe('logs-a|logs-b');
  });
});
