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
import type { ConvertOptions } from './fields';
import { fieldCandidates, flattenSource } from './fields';
import { parseTimestamp } from './parse-timestamp';

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

  const { timestamp: tsCandidates, message: msgCandidates } = fieldCandidates(options);

  // OpenSearch's metadata fields are underscore-prefixed, so rename them on the way in.
  const entries: LogEntry[] = hits.map(({ _id: id, _index: index, _source: rawSource }) => {
    const source = rawSource ?? {};
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
    if (id !== undefined) labels['_id'] = id;
    if (index !== undefined) labels['_index'] = index;

    return { timestamp, line, labels };
  });

  const total = response?.hits?.total;
  const result: LogData = {
    entries,
    totalCount: total?.value ?? entries.length,
  };
  // `relation: 'gte'` means OpenSearch stopped counting (default cap 10,000), so the true
  // total is at least this — surface that rather than paying for track_total_hits. An exact
  // total larger than the page means `size` truncated the result.
  if (total?.relation === 'gte' || (total?.value ?? 0) > entries.length) {
    result.hasMore = true;
  }

  return result;
}
