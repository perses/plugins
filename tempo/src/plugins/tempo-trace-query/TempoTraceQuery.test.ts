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

import type { TraceQueryContext } from '@perses-dev/plugin-system';

import type { TempoTraceQuerySpec } from '../../model';
import { TempoTraceQuery } from './TempoTraceQuery';

const dependsOn = (spec: TempoTraceQuerySpec): string[] => {
  if (!TempoTraceQuery.dependsOn) throw new Error('dependsOn is not defined');
  return TempoTraceQuery.dependsOn(spec, {} as TraceQueryContext).variables ?? [];
};

describe('TempoTraceQuery.dependsOn', () => {
  it('includes a variable used as the trace ID', () => {
    expect(dependsOn({ query: '$trace_id' })).toEqual(['trace_id']);
  });

  it('includes variables used in a TraceQL query', () => {
    expect(
      dependsOn({
        query: '{ resource.k8s.namespace.name =~ `$namespace` && resource.service.name = "${service}" }',
      }),
    ).toEqual(['namespace', 'service']);
  });

  it('combines datasource and query variables without duplicates', () => {
    expect(
      dependsOn({
        query: '{ resource.k8s.cluster.name = "$cluster" }',
        datasource: '$cluster',
      }),
    ).toEqual(['cluster']);
  });

  it('returns no variables for an empty query', () => {
    expect(dependsOn({ query: '' })).toEqual([]);
  });
});
