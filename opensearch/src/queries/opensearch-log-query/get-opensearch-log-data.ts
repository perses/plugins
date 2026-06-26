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

import { replaceVariables, LogQueryPlugin, LogQueryContext } from '@perses-dev/plugin-system';
import { LogEntry, LogData } from '@perses-dev/spec';
import { OpenSearchClient } from '../../model/opensearch-client';
import { OpenSearchPPLResponse } from '../../model/opensearch-client-types';
import { DEFAULT_DATASOURCE, DEFAULT_MESSAGE_FIELDS, DEFAULT_TIMESTAMP_FIELDS } from '../constants';
import { OpenSearchLogQuerySpec } from './opensearch-log-query-types';

/**
 * Bound the query to the panel time range using a PPL `where` clause on the
 * configured timestamp field (`@timestamp` by default).
 * The bound is injected immediately after the source clause so it runs before any
 * pipe that drops the timestamp column from the schema (stats, fields, top, etc.).
 * If the user already filters on the timestamp field themselves, PPL ANDs the two clauses.
 */
interface BoundedPPLOptions {
  index?: string;
  timestampField?: string;
  disableTimeFilter?: boolean;
}

/**
 * Escape a user-supplied identifier (timestamp field name) for safe interpolation
 * inside a PPL backtick-quoted identifier. A backtick in the value would otherwise
 * close the quoting early and let the rest of the string be parsed as PPL, producing
 * an invalid — or potentially injected — query. PPL escapes a literal backtick by
 * doubling it.
 */
function escapeIdentifier(name: string): string {
  return name.replace(/`/g, '``');
}

export function buildBoundedPPL(
  userQuery: string,
  start: Date,
  end: Date,
  { index, timestampField = '@timestamp', disableTimeFilter = false }: BoundedPPLOptions = {}
): string {
  let trimmed = userQuery.trim();

  if (index && !/^(?:search\s+)?source\s*=/i.test(trimmed)) {
    trimmed = `source=${index} | ${trimmed}`;
  }

  // Skip the auto-injected time-range clause when the caller manages their own time
  // bounds (disableTimeFilter).
  if (disableTimeFilter) {
    return trimmed;
  }

  const startIso = start.toISOString();
  const endIso = end.toISOString();
  // timestampField is user-editable, so escape it before embedding it in the
  // backtick-quoted identifier (the ISO bounds are machine-generated and safe).
  const tsField = escapeIdentifier(timestampField);
  const bound = `where \`${tsField}\` >= '${startIso}' and \`${tsField}\` <= '${endIso}'`;

  const firstPipe = trimmed.indexOf('|');
  if (firstPipe === -1) {
    return `${trimmed} | ${bound}`;
  }

  const sourceClause = trimmed.slice(0, firstPipe).trimEnd();
  const rest = trimmed.slice(firstPipe + 1).trimStart();
  return `${sourceClause} | ${bound} | ${rest}`;
}

function pickIndex(cols: Array<{ name: string }>, candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = cols.findIndex((c) => c.name === candidate);
    if (idx !== -1) return idx;
  }
  return -1;
}

interface ConvertOptions {
  timestampField?: string;
  messageField?: string;
}

export function convertPPLToLogs(response: OpenSearchPPLResponse, options: ConvertOptions = {}): LogData {
  const { schema = [], datarows = [] } = response;

  const tsCandidates = options.timestampField
    ? [options.timestampField, ...DEFAULT_TIMESTAMP_FIELDS]
    : DEFAULT_TIMESTAMP_FIELDS;
  const msgCandidates = options.messageField
    ? [options.messageField, ...DEFAULT_MESSAGE_FIELDS]
    : DEFAULT_MESSAGE_FIELDS;

  const tsIdx = pickIndex(schema, tsCandidates);
  const msgIdx = pickIndex(schema, msgCandidates);

  const entries: LogEntry[] = datarows.map((row) => {
    const rawTs = tsIdx !== -1 ? row[tsIdx] : null;
    const rawMsg = msgIdx !== -1 ? row[msgIdx] : null;

    const timestamp = parseTimestamp(rawTs);
    const line = rawMsg !== null && rawMsg !== undefined ? String(rawMsg) : JSON.stringify(rowToObject(schema, row));

    const labels: Record<string, string> = {};
    schema.forEach((col, i) => {
      if (i === tsIdx || i === msgIdx) return;
      const v = row[i];
      if (v !== null && v !== undefined) labels[col.name] = String(v);
    });

    return { timestamp, line, labels };
  });

  // A PPL response carries no separate "total hits" field, so totalCount reflects
  // the number of rows actually returned by the query (bounded by any `head`/limit
  // the user added), not a grand total of matching documents.
  return { entries, totalCount: entries.length };
}

function parseTimestamp(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') {
    // Heuristic: anything past year ~5138 in seconds-since-epoch (1e11s) must
    // really be milliseconds-since-epoch. OpenSearch usually returns ms here.
    return v > 1e11 ? v / 1000 : v;
  }
  const parsed = Date.parse(String(v));
  return Number.isNaN(parsed) ? 0 : parsed / 1000;
}

function rowToObject(
  schema: OpenSearchPPLResponse['schema'],
  row: Array<string | number | boolean | null>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  schema.forEach((col, i) => {
    out[col.name] = row[i];
  });
  return out;
}

export const getOpenSearchLogData: LogQueryPlugin<OpenSearchLogQuerySpec>['getLogData'] = async (
  spec: OpenSearchLogQuerySpec,
  context: LogQueryContext,
  abortSignal?: AbortSignal
) => {
  if (!spec.query) {
    return {
      logs: { entries: [], totalCount: 0 },
      timeRange: { start: context.timeRange.start, end: context.timeRange.end },
    };
  }

  const query = replaceVariables(spec.query, context.variableState);
  const resolvedIndex = spec.index ? replaceVariables(spec.index, context.variableState) : undefined;
  const client = (await context.datasourceStore.getDatasourceClient<OpenSearchClient>(
    spec.datasource ?? DEFAULT_DATASOURCE
  )) as OpenSearchClient;

  const { start, end } = context.timeRange;
  const boundedQuery = buildBoundedPPL(query, start, end, {
    index: resolvedIndex,
    timestampField: spec.timestampField,
    disableTimeFilter: spec.disableTimeFilter,
  });

  const response = await client.ppl({ query: boundedQuery }, undefined, abortSignal);

  return {
    logs: convertPPLToLogs(response, {
      timestampField: spec.timestampField,
      messageField: spec.messageField,
    }),
    timeRange: { start, end },
    metadata: {
      executedQueryString: boundedQuery,
    },
  };
};
