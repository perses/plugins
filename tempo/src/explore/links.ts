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

function buildExploreLink(timeZone: string, extraData?: Record<string, unknown>): string {
  const params = new URLSearchParams({
    explorer: 'Tempo-TempoExplorer',
    data: JSON.stringify({
      queries: [
        {
          kind: 'TraceQuery',
          spec: {
            plugin: {
              kind: 'TempoTraceQuery',
              spec: {
                query: '${traceId}',
                datasource: {
                  kind: 'TempoDatasource',
                  name: '${datasourceName}',
                },
              },
            },
          },
        },
      ],
      ...extraData,
    }),
    tz: timeZone,
  });

  // Unescape ${...} template variables so they survive as literal text for runtime interpolation.
  return `/explore?${params}`.replace(/%24%7B(\w+)%7D/g, '${$1}');
}

export function linkToTrace(timeZone: string): string {
  return buildExploreLink(timeZone);
}

export function linkToSpan(timeZone: string): string {
  return buildExploreLink(timeZone, { spanId: '${spanId}' });
}
