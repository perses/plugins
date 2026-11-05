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
import { MAX_SEARCH_SIZE } from '../../constants';
import type { SearchBodyOptions } from './search';
import { buildDefaultSort, buildTimeRangeFilter, DEFAULT_TIMESTAMP_FIELD, resolveSize } from './search';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseBody(userJson: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(userJson);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`Query DSL is not valid JSON: ${detail}`, { cause: e });
  }

  if (!isRecord(parsed)) {
    throw new Error('Query DSL must be a JSON object shaped like a _search request body, e.g. {"query": {...}}.');
  }

  return parsed;
}

function resolveDslSize(userSize: unknown, limit?: number): unknown {
  if (userSize === undefined) return resolveSize(limit);
  // Without a limit, a numeric body size is still kept within what `_search` accepts.
  if (limit === undefined) return typeof userSize === 'number' ? Math.min(userSize, MAX_SEARCH_SIZE) : userSize;
  // A non-numeric size (e.g. a string) can't be compared, so the limit applies to keep the cap.
  const cap = resolveSize(limit);
  return typeof userSize === 'number' ? Math.min(userSize, cap) : cap;
}

/**
 * Build a `_search` body from a raw Query DSL document. The user's JSON is treated as a
 * complete `_search` request body — the thing you would paste out of Dev Tools — so any
 * key we do not manage (`_source`, `aggs`, `highlight`, …) passes straight through.
 *
 * `limit` caps `size`: with both set the smaller wins, so the body can ask for fewer documents
 * but never more than the configured limit. With only one set, that one applies. Either way a
 * numeric size never exceeds MAX_SEARCH_SIZE, the most `_search` accepts by default. The user wins
 * on `sort`; we only supply a default. Their `query`, if present, is nested under our
 * `bool.must` while the time range goes in `bool.filter`. That still means exactly "AND",
 * but keeps the user's query in scoring context so `_score` sorts, `track_scores` and
 * `min_score` behave as in the raw request. We deliberately do not try to merge into their
 * bool clause, because rewriting a user's query semantics is far worse than one extra
 * level of nesting.
 */
export function buildDslSearchBody(
  userJson: string,
  start: Date,
  end: Date,
  { timestampField = DEFAULT_TIMESTAMP_FIELD, disableTimeFilter = false, limit }: SearchBodyOptions = {},
): OpenSearchSearchRequestBody {
  const parsed = parseBody(userJson);
  const userQuery = parsed.query;
  // A present but falsey or non-object `query` (false, null, "", 0, []) must not be read as
  // "no query" — that would silently widen the request to every document in the range.
  if ('query' in parsed && !isRecord(userQuery)) {
    throw new Error('Query DSL "query" must be a JSON object, e.g. {"query": {"match": {...}}}.');
  }

  const body: OpenSearchSearchRequestBody = { ...parsed };
  body.size = resolveDslSize(parsed.size, limit);
  body.sort = parsed.sort ?? buildDefaultSort(timestampField);

  if (disableTimeFilter) {
    body.query = userQuery ?? { match_all: {} };
    return body;
  }

  const timeFilter = buildTimeRangeFilter(timestampField, start, end);
  body.query = userQuery ? { bool: { must: [userQuery], filter: [timeFilter] } } : { bool: { filter: [timeFilter] } };

  return body;
}
