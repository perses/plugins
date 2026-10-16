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

import type { OpenSearchSQLParams } from '../../../model/opensearch-client';
import { buildTimeRangeFilter, DEFAULT_TIMESTAMP_FIELD } from './search';

export interface SqlRequestOptions {
  timestampField?: string;
  disableTimeFilter?: boolean;
}

/**
 * Bound a SQL query to the panel time range using the `_sql` API's `filter` request
 * field, which OpenSearch ANDs into the DSL it generates. Unlike PPL — where the bound
 * has to be spliced into the query string — this leaves the user's SQL completely
 * untouched, so there is nothing to escape and no parse to get wrong.
 */
export function buildSqlRequest(
  userQuery: string,
  start: Date,
  end: Date,
  { timestampField = DEFAULT_TIMESTAMP_FIELD, disableTimeFilter = false }: SqlRequestOptions = {},
): OpenSearchSQLParams {
  const query = userQuery.trim();

  if (disableTimeFilter) {
    return { query };
  }

  return {
    query,
    filter: buildTimeRangeFilter(timestampField, start, end),
  };
}
