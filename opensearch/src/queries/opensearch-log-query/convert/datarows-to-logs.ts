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

import type { LogEntry, LogData } from '@perses-dev/spec';
import type { OpenSearchDatarowsResponse } from '../../../model/opensearch-client-types';
import { DEFAULT_MESSAGE_FIELDS, DEFAULT_TIMESTAMP_FIELDS } from '../../constants';
import { parseTimestamp } from './parse-timestamp';

function pickIndex(cols: Array<{ name: string }>, candidates: string[]): number {
  for (const candidate of candidates) {
    const idx = cols.findIndex((c) => c.name === candidate);
    if (idx !== -1) return idx;
  }
  return -1;
}

export interface ConvertOptions {
  timestampField?: string;
  messageField?: string;
}

export function convertDatarowsToLogs(response: OpenSearchDatarowsResponse, options: ConvertOptions = {}): LogData {
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

function rowToObject(
  schema: OpenSearchDatarowsResponse['schema'],
  row: Array<string | number | boolean | null>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  schema.forEach((col, i) => {
    out[col.name] = row[i];
  });
  return out;
}
