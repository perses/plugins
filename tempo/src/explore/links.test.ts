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

import { linkToTrace, linkToSpan } from './links';

function parseLink(link: string) {
  const params = new URLSearchParams(link.split('?')[1]);
  return {
    explorer: params.get('explorer'),
    data: JSON.parse(params.get('data')!),
    tz: params.get('tz'),
  };
}

describe('linkToTrace', () => {
  it('builds explore link with template variables', () => {
    const link = linkToTrace('America/New_York');
    expect(parseLink(link)).toEqual({
      explorer: 'Tempo-TempoExplorer',
      data: {
        queries: [
          {
            kind: 'TraceQuery',
            spec: {
              plugin: {
                kind: 'TempoTraceQuery',
                spec: {
                  query: '${traceId}',
                  datasource: { kind: 'TempoDatasource', name: '${datasourceName}' },
                },
              },
            },
          },
        ],
      },
      tz: 'America/New_York',
    });
    expect(link).toContain('${traceId}');
    expect(link).toContain('${datasourceName}');
    expect(link).not.toContain('%24%7B');
  });
});

describe('linkToSpan', () => {
  it('includes spanId template variable', () => {
    const link = linkToSpan('UTC');
    expect(link).toContain('${spanId}');
  });
});
