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

import type { VariableStateMap } from '@perses-dev/components';

import type { PrometheusExemplarLinkSpec } from '../types';
import { buildExemplarLinks, prepareExemplarLinks } from './exemplar-links';

function build(
  links: PrometheusExemplarLinkSpec[] | undefined,
  labels: Record<string, string>,
  variableState: VariableStateMap = {},
): ReturnType<typeof buildExemplarLinks> {
  return buildExemplarLinks(prepareExemplarLinks(links, variableState), labels);
}

describe('exemplar links', () => {
  const jaeger: PrometheusExemplarLinkSpec = {
    name: 'Jaeger',
    url: 'http://localhost:16686/trace/${traceId}',
    traceIDLabel: 'trace_id',
  };

  it('returns undefined when the datasource has no links', () => {
    expect(build(undefined, { trace_id: 'abc123' })).toBeUndefined();
    expect(build([], { trace_id: 'abc123' })).toBeUndefined();
  });

  it('replaces the trace ID placeholder with the value of the trace ID label', () => {
    expect(build([jaeger], { trace_id: 'abc123', span_id: 'def456' })).toEqual([
      { name: 'Jaeger', url: 'http://localhost:16686/trace/abc123' },
    ]);
  });

  it('supports the short placeholder syntax and several occurrences', () => {
    const link = { url: 'https://traces.example.com/$traceId?id=${traceId}', traceIDLabel: 'traceID' };
    expect(build([link], { traceID: 'abc123' })).toEqual([{ url: 'https://traces.example.com/abc123?id=abc123' }]);
  });

  it('skips the links whose trace ID label is missing or empty on the exemplar', () => {
    const tempo = { name: 'Tempo', url: 'https://tempo.example.com/trace/${traceId}', traceIDLabel: 'traceID' };
    expect(build([jaeger, tempo], { traceID: 'abc123' })).toEqual([
      { name: 'Tempo', url: 'https://tempo.example.com/trace/abc123' },
    ]);
    expect(build([jaeger, tempo], { user: 'alice' })).toBeUndefined();
    expect(build([jaeger], { trace_id: '' })).toBeUndefined();
  });

  it('URL encodes the trace ID by default', () => {
    expect(build([jaeger], { trace_id: '../admin?x=1&y=$z' })).toEqual([
      { name: 'Jaeger', url: 'http://localhost:16686/trace/..%2Fadmin%3Fx%3D1%26y%3D%24z' },
    ]);
  });

  it('honors an explicit format on the trace ID placeholder', () => {
    const link = { url: 'https://traces.example.com/${traceId:raw}', traceIDLabel: 'trace_id' };
    expect(build([link], { trace_id: 'a/b' })).toEqual([{ url: 'https://traces.example.com/a/b' }]);
  });

  it('replaces dashboard variables in the URL and the name', () => {
    const link = {
      name: 'Traces of $env',
      url: 'https://traces.example.com/${env}/trace/${traceId}',
      traceIDLabel: 'trace_id',
    };
    const variableState: VariableStateMap = { env: { value: 'prod', loading: false } };
    expect(build([link], { trace_id: 'abc123' }, variableState)).toEqual([
      { name: 'Traces of prod', url: 'https://traces.example.com/prod/trace/abc123' },
    ]);
  });

  it('gives the exemplar trace ID precedence over a dashboard variable with the same name', () => {
    const variableState: VariableStateMap = { traceId: { value: 'from-variable', loading: false } };
    expect(build([jaeger], { trace_id: 'abc123' }, variableState)).toEqual([
      { name: 'Jaeger', url: 'http://localhost:16686/trace/abc123' },
    ]);
  });

  it('does not interpolate variables contained in the trace ID itself', () => {
    const link = { url: 'https://traces.example.com/${traceId:raw}', traceIDLabel: 'trace_id' };
    const variableState: VariableStateMap = { env: { value: 'prod', loading: false } };
    expect(build([link], { trace_id: '$env' }, variableState)).toEqual([{ url: 'https://traces.example.com/$env' }]);
  });

  it('ignores incomplete links', () => {
    expect(build([{ url: '', traceIDLabel: 'trace_id' }], { trace_id: 'abc123' })).toBeUndefined();
    expect(
      build([{ url: 'https://traces.example.com/${traceId}', traceIDLabel: '' }], { '': 'abc123' }),
    ).toBeUndefined();
  });
});
