// Copyright 2025 The Perses Authors
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

const linkToTraceParams = new URLSearchParams({
  explorer: 'Tempo-TempoExplorer',
  data: JSON.stringify({
    queries: [
      {
        kind: 'TraceQuery',
        spec: {
          plugin: {
            kind: 'TempoTraceQuery',
            spec: {
              query: 'TRACEID',
              datasource: {
                kind: 'TempoDatasource',
                name: 'DATASOURCENAME',
              },
            },
          },
        },
      },
    ],
  }),
});

const linkToSpanParams = new URLSearchParams({
  explorer: 'Tempo-TempoExplorer',
  data: JSON.stringify({
    queries: [
      {
        kind: 'TraceQuery',
        spec: {
          plugin: {
            kind: 'TempoTraceQuery',
            spec: {
              query: 'TRACEID',
              datasource: {
                kind: 'TempoDatasource',
                name: 'DATASOURCENAME',
              },
            },
          },
        },
      },
    ],
    spanId: 'SPANID',
  }),
});

// add ${...} syntax after the URL is URL-encoded, because the characters ${} must not be URL-encoded
export const linkToTrace = `/explore?${linkToTraceParams}`
  .replace('DATASOURCENAME', '${datasourceName}')
  .replace('TRACEID', '${traceId}');

// add ${...} syntax after the URL is URL-encoded, because the characters ${} must not be URL-encoded
export const linkToSpan = `/explore?${linkToSpanParams}`
  .replace('DATASOURCENAME', '${datasourceName}')
  .replace('TRACEID', '${traceId}')
  .replace('SPANID', '${spanId}');
