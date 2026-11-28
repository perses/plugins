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

import { ClickHouseTraceQuery } from './ClickHouseTraceQuery';

describe('ClickHouseTraceQuery', () => {
  it('should properly resolve variable dependencies', () => {
    if (!ClickHouseTraceQuery.dependsOn) throw new Error('dependsOn is not defined');
    const { variables } = ClickHouseTraceQuery.dependsOn(
      {
        query:
          "SELECT * FROM otel_traces WHERE ServiceName = '$service' AND (SpanName = '$span' OR ServiceName = '$service')",
      },
      {} as TraceQueryContext,
    );
    expect(variables).toEqual(['service', 'span']);
  });

  it('should create initial options with empty query', () => {
    const initialOptions = ClickHouseTraceQuery.createInitialOptions();
    expect(initialOptions).toEqual({ query: '' });
  });
});
