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

function parseBody(userJson: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(userJson);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`Query DSL is not valid JSON: ${detail}`);
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Query DSL must be a JSON object shaped like a _search request body, e.g. {"query": {...}}.');
  }

  return parsed as Record<string, unknown>;
}

/**
 * Build a `_search` body from a raw Query DSL document. The user's JSON is treated as a
 * complete `_search` request body — the thing you would paste out of Dev Tools — so any
 * key we do not manage (`_source`, `aggs`, `highlight`, …) passes straight through.
 *
 * The user wins on `size` and `sort`; we only supply defaults. Their `query`, if present,
 * is nested inside our `bool.filter` next to the time range, which is valid DSL and means
 * exactly "AND" — we deliberately do not try to merge into their bool clause, because
 * rewriting a user's query semantics is far worse than one extra level of nesting.
 */
export function buildDslSearchBody(
  userJson: string,
  start: Date,
  end: Date,
  { timestampField = DEFAULT_TIMESTAMP_FIELD, disableTimeFilter = false, limit }: SearchBodyOptions = {}
): OpenSearchSearchRequestBody {
  const parsed = parseBody(userJson);
  const userQuery = parsed.query as Record<string, unknown> | undefined;

  const body: OpenSearchSearchRequestBody = { ...parsed };
  body.size = parsed.size ?? resolveSize(limit);
  body.sort = parsed.sort ?? buildDefaultSort(timestampField);

  if (disableTimeFilter) {
    body.query = userQuery ?? { match_all: {} };
    return body;
  }

  const filter: Array<Record<string, unknown>> = [buildTimeRangeFilter(timestampField, start, end)];
  if (userQuery) {
    filter.push(userQuery);
  }
  body.query = { bool: { filter } };

  return body;
}
