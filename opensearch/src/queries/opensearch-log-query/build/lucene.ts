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

import type { OpenSearchSearchRequestBody } from '../../../model/opensearch-client-types';
import type { SearchBodyOptions } from './search';
import { buildDefaultSort, buildTimeRangeFilter, DEFAULT_TIMESTAMP_FIELD, resolveSize } from './search';

/**
 * Build a `_search` body from a Lucene (query string) query: the user's string becomes a
 * `query_string` clause ANDed with the panel time range inside `bool.filter`. A blank
 * query is legitimate — it means "everything in this time window".
 */
export function buildLuceneSearchBody(
  userQuery: string,
  start: Date,
  end: Date,
  { timestampField = DEFAULT_TIMESTAMP_FIELD, disableTimeFilter = false, limit }: SearchBodyOptions = {}
): OpenSearchSearchRequestBody {
  const trimmed = userQuery.trim();

  const filter: Array<Record<string, unknown>> = [];
  if (!disableTimeFilter) {
    filter.push(buildTimeRangeFilter(timestampField, start, end));
  }
  if (trimmed.length > 0) {
    filter.push({ query_string: { query: trimmed, analyze_wildcard: true } });
  }

  return {
    size: resolveSize(limit),
    sort: buildDefaultSort(timestampField),
    query: { bool: { filter } },
  };
}
