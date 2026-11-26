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

import type { QueryDefinition } from '@perses-dev/spec';

import type { ClickHouseTraceQuerySpec } from '../queries/click-house-trace-query/click-house-trace-query-types';

/** Identifier of the ClickHouse explorer among the explorers of Perses: `<module>-<plugin>`. */
export const CLICKHOUSE_EXPLORER_KEY = 'ClickHouse-ClickHouseExplorer';

export const TRACE_QUERY_KIND = 'ClickHouseTraceQuery';

/** State of the ClickHouse explorer, kept in the URL of the page. */
export interface ClickHouseExplorerQueryParams {
  tab?: string;
  /** Time series queries of the graph and of the table. */
  queries?: QueryDefinition[];
  traceQueries?: QueryDefinition[];
  profileQueries?: QueryDefinition[];
  /** Span to select in the trace. */
  spanId?: string;
}

function buildTraceLink(searchQuery: QueryDefinition | undefined, timeZone: string, spanId?: string): string {
  // The trace is read where it was found: with the datasource and the table of the search query.
  const { datasource, table } = (searchQuery?.spec.plugin.spec ?? {}) as Partial<ClickHouseTraceQuerySpec>;
  const data: ClickHouseExplorerQueryParams = {
    tab: 'traces',
    traceQueries: [
      {
        kind: 'TraceQuery',
        spec: {
          plugin: {
            kind: TRACE_QUERY_KIND,
            spec: { ...(datasource !== undefined && { datasource }), ...(table && { table }), query: '${traceId}' },
          },
        },
      },
    ],
    ...(spanId !== undefined && { spanId }),
  };
  const params = new URLSearchParams({
    explorer: CLICKHOUSE_EXPLORER_KEY,
    data: JSON.stringify(data),
    tz: timeZone,
  });
  // The panels replace the ${...} variables of a link: keep them readable in the encoded URL.
  return `/explore?${params}`.replace(/%24%7B(\w+)%7D/g, '${$1}');
}

/** linkToTrace returns the link template opening a trace in the explorer. Panels replace `${traceId}`. */
export function linkToTrace(searchQuery: QueryDefinition | undefined, timeZone: string): string {
  return buildTraceLink(searchQuery, timeZone);
}

/** linkToSpan returns the link template opening a span of a trace. Panels replace `${traceId}` and `${spanId}`. */
export function linkToSpan(searchQuery: QueryDefinition | undefined, timeZone: string): string {
  return buildTraceLink(searchQuery, timeZone, '${spanId}');
}
