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

import type { LogData, LogEntry } from '@perses-dev/spec';
import type { OpenSearchSearchResponse } from '../../../model/opensearch-client-types';
import { DEFAULT_MESSAGE_FIELDS, DEFAULT_TIMESTAMP_FIELDS } from '../../constants';
import type { ConvertOptions } from './datarows-to-logs';
import { parseTimestamp } from './parse-timestamp';

/**
 * Flatten a `_source` document to dot-separated keys, because LogEntry labels are a flat
 * `Record<string, string>`. Arrays are JSON-stringified rather than indexed, since
 * `tags.0`/`tags.1` labels are noise; null/undefined values are dropped so they do not
 * render as the strings "null"/"undefined".
 */
export function flattenSource(source: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};

  const walk = (value: unknown, prefix: string): void => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      out[prefix] = JSON.stringify(value);
      return;
    }
    if (typeof value === 'object') {
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        walk(child, prefix ? `${prefix}.${key}` : key);
      }
      return;
    }
    out[prefix] = String(value);
  };

  for (const [key, value] of Object.entries(source)) {
    walk(value, key);
  }

  return out;
}

/** First candidate present in the flattened document, or undefined if none match. */
function pickKey(flat: Record<string, string>, candidates: string[]): string | undefined {
  return candidates.find((candidate) => candidate in flat);
}

/**
 * Convert a `_search` response into the same LogData shape the datarows converter produces, so
 * Lucene and Query DSL results are indistinguishable from PPL/SQL results downstream.
 */
export function convertHitsToLogs(response: OpenSearchSearchResponse, options: ConvertOptions = {}): LogData {
  const hits = response?.hits?.hits ?? [];

  const tsCandidates = options.timestampField
    ? [options.timestampField, ...DEFAULT_TIMESTAMP_FIELDS]
    : DEFAULT_TIMESTAMP_FIELDS;
  const msgCandidates = options.messageField
    ? [options.messageField, ...DEFAULT_MESSAGE_FIELDS]
    : DEFAULT_MESSAGE_FIELDS;

  const entries: LogEntry[] = hits.map((hit) => {
    const source = hit._source ?? {};
    const flat = flattenSource(source);

    const tsKey = pickKey(flat, tsCandidates);
    const msgKey = pickKey(flat, msgCandidates);

    const timestamp = tsKey ? parseTimestamp(flat[tsKey]) : 0;
    const line = msgKey ? (flat[msgKey] as string) : JSON.stringify(source);

    const labels: Record<string, string> = {};
    for (const [key, value] of Object.entries(flat)) {
      if (key === tsKey || key === msgKey) continue;
      labels[key] = value;
    }
    // Document identity is genuinely useful: _index disambiguates a wildcard pattern and
    // _id lets a user correlate a line back to the source document.
    if (hit._id !== undefined) labels._id = hit._id;
    if (hit._index !== undefined) labels._index = hit._index;

    return { timestamp, line, labels };
  });

  const total = response?.hits?.total;
  const result: LogData = {
    entries,
    totalCount: total?.value ?? entries.length,
  };
  // `relation: 'gte'` means OpenSearch stopped counting (default cap 10,000), so the true
  // total is at least this — surface that rather than paying for track_total_hits.
  if (total?.relation === 'gte') {
    result.hasMore = true;
  }

  return result;
}
