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

const traceQuerySQL = "SELECT * FROM TRACETABLE WHERE trace_id = 'TRACEID' ORDER BY timestamp ASC";

const linkToTraceParams = new URLSearchParams({
  explorer: 'GreptimeDB-GreptimeDBTraceExplorer',
  data: JSON.stringify({
    queries: [
      {
        kind: 'TraceQuery',
        spec: {
          plugin: {
            kind: 'GreptimeDBTraceQuery',
            spec: {
              query: traceQuerySQL,
              datasource: {
                kind: 'GreptimeDBDatasource',
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
  explorer: 'GreptimeDB-GreptimeDBTraceExplorer',
  data: JSON.stringify({
    queries: [
      {
        kind: 'TraceQuery',
        spec: {
          plugin: {
            kind: 'GreptimeDBTraceQuery',
            spec: {
              query: traceQuerySQL,
              datasource: {
                kind: 'GreptimeDBDatasource',
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

// add ${...} syntax after URL encoding so placeholder markers remain valid template variables.
export const linkToTrace = `/explore?${linkToTraceParams}`
  .replace('DATASOURCENAME', '${datasourceName}')
  .replace('TRACETABLE', '${trace_table}')
  .replace('TRACEID', '${traceId}');

export const linkToSpan = `/explore?${linkToSpanParams}`
  .replace('DATASOURCENAME', '${datasourceName}')
  .replace('TRACETABLE', '${trace_table}')
  .replace('TRACEID', '${traceId}')
  .replace('SPANID', '${spanId}');

export function extractTraceTableFromSQL(query: string): string | undefined {
  // Handles common forms:
  // FROM schema.table
  // FROM "schema"."table"
  // FROM `schema`.`table`
  const match = query.match(
    /\bfrom\s+((?:[`"'][^`"']+[`"']|\[[^\]]+\]|[a-zA-Z_][\w$]*)(?:\s*\.\s*(?:[`"'][^`"']+[`"']|\[[^\]]+\]|[a-zA-Z_][\w$]*))?)/i
  );
  return match?.[1]?.replace(/\s+/g, '');
}

export function resolveTraceLinkTemplate(template: string, query: string): string {
  const table = extractTraceTableFromSQL(query);
  if (!table) return template;
  return template.replaceAll('${trace_table}', table);
}

export function buildGreptimeTraceLinkFromQuery(query: string): string {
  return resolveTraceLinkTemplate(linkToTrace, query);
}
