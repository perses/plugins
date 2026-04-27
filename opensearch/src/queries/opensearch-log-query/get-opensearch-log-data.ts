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

import { replaceVariables } from '@perses-dev/plugin-system';
import { LogEntry, LogData } from '@perses-dev/core';
import { OpenSearchClient } from '../../model/opensearch-client';
import { OpenSearchPPLResponse } from '../../model/opensearch-client-types';
import { DEFAULT_DATASOURCE, DEFAULT_MESSAGE_FIELDS, DEFAULT_TIMESTAMP_FIELDS } from '../constants';
import { OpenSearchLogQuerySpec } from './opensearch-log-query-types';
import { LogQueryPlugin, LogQueryContext } from './log-query-plugin-interface';

/**
 * Bound the query to the panel time range using a PPL `where` clause on @timestamp.
 * If the user already filters on @timestamp we append another clause — PPL ANDs them.
 */
export function buildBoundedPPL(
  userQuery: string,
  start: Date,
  end: Date,
  index?: string,
  timestampField: string = '@timestamp'
): string {
  const trimmed = userQuery.trim();
  let base = trimmed;

  if (index && !/^source\s*=/i.test(trimmed)) {
    base = `source=${index} | ${trimmed}`;
  }

  const startIso = start.toISOString();
  const endIso = end.toISOString();
  return `${base} | where \`${timestampField}\` >= '${startIso}' and \`${timestampField}\` <= '${endIso}'`;
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

  return { entries, totalCount: entries.length };
}

function parseTimestamp(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') {
    // OpenSearch typically returns epoch millis; normalize to seconds.
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
  context: LogQueryContext
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
  const boundedQuery = buildBoundedPPL(query, start, end, resolvedIndex, spec.timestampField);

  const response = await client.ppl({ query: boundedQuery });

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
