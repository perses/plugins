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

import type { DatasourceSelector } from '@perses-dev/spec';

import type { OpenSearchDatarowsResponse } from '../../model/opensearch-client-types';

/**
 * Query language a single log query is written in.
 * `ppl` and `sql` go to the SQL-plugin endpoints and return the `datarows` format;
 * `lucene` and `dsl` go to `_search` and return hits.
 */
export type OpenSearchQueryLanguage = 'ppl' | 'sql' | 'lucene' | 'dsl';

export const OPENSEARCH_QUERY_LANGUAGES: readonly OpenSearchQueryLanguage[] = ['ppl', 'sql', 'lucene', 'dsl'];

export interface OpenSearchLogQuerySpec {
  query: string;
  /** Defaults to `ppl` when absent, which keeps pre-existing dashboards working unchanged. */
  queryLanguage?: OpenSearchQueryLanguage;
  datasource?: DatasourceSelector;
  /** Required for `lucene` and `dsl` (it forms the `_search` path). Ignored for `sql`, where the index lives in the FROM clause. */
  index?: string;
  timestampField?: string;
  messageField?: string;
  /** When true, the panel time range is NOT injected into the request. */
  disableTimeFilter?: boolean;
  /** `_search` size for `lucene` and `dsl`. Defaults to DEFAULT_SEARCH_SIZE. */
  limit?: number;
}

export type OpenSearchLogQueryResponse = OpenSearchDatarowsResponse;

export function resolveQueryLanguage(spec: Pick<OpenSearchLogQuerySpec, 'queryLanguage'>): OpenSearchQueryLanguage {
  const language = spec.queryLanguage;
  // Fall back to PPL for an unrecognised value as well as an absent one: the CUE schema rejects
  // unknown languages on save, but a hand-edited or hand-crafted spec can still reach the editor,
  // and an unknown key would otherwise resolve to `undefined` metadata and throw during render.
  return language !== undefined && OPENSEARCH_QUERY_LANGUAGES.includes(language) ? language : 'ppl';
}

/** Languages whose index goes into the request URL and therefore cannot be omitted. */
export function requiresIndex(language: OpenSearchQueryLanguage): boolean {
  return language === 'lucene' || language === 'dsl';
}
