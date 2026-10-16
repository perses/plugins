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

import type { LogQueryContext, LogQueryPlugin } from '@perses-dev/plugin-system';
import { replaceVariables } from '@perses-dev/plugin-system';
import type { LogData } from '@perses-dev/spec';

import type { OpenSearchClient } from '../../model/opensearch-client';
import { DEFAULT_DATASOURCE } from '../constants';
import { buildBoundedPPL, buildDslSearchBody, buildLuceneSearchBody, buildSqlRequest } from './build';
import { convertDatarowsToLogs, convertHitsToLogs } from './convert';
import type { OpenSearchLogQuerySpec } from './opensearch-log-query-types';
import { requiresIndex, resolveQueryLanguage } from './opensearch-log-query-types';

export const getOpenSearchLogData: LogQueryPlugin<OpenSearchLogQuerySpec>['getLogData'] = async (
  spec: OpenSearchLogQuerySpec,
  context: LogQueryContext,
  abortSignal?: AbortSignal,
) => {
  const { start, end } = context.timeRange;
  const language = resolveQueryLanguage(spec);

  // Treat a blank or whitespace-only query as "no query": trimming it would leave an empty
  // string that produces an invalid request, so short-circuit before hitting the API.
  // A blank Lucene query is the one exception — it legitimately means "everything in range".
  if (!spec.query?.trim() && language !== 'lucene') {
    return { logs: { entries: [], totalCount: 0 }, timeRange: { start, end } };
  }

  const query = replaceVariables(spec.query, context.variableState);
  const resolvedIndex = spec.index ? replaceVariables(spec.index, context.variableState) : undefined;

  if (requiresIndex(language) && !resolvedIndex) {
    throw new Error(`An index is required when the query language is ${language}.`);
  }

  const client = (await context.datasourceStore.getDatasourceClient<OpenSearchClient>(
    spec.datasource ?? DEFAULT_DATASOURCE,
  )) as OpenSearchClient;

  const convertOptions = { timestampField: spec.timestampField, messageField: spec.messageField };
  const searchOptions = {
    timestampField: spec.timestampField,
    disableTimeFilter: spec.disableTimeFilter,
    limit: spec.limit,
  };

  let logs: LogData;
  let executedQueryString: string;

  switch (language) {
    case 'sql': {
      const request = buildSqlRequest(query, start, end, {
        timestampField: spec.timestampField,
        disableTimeFilter: spec.disableTimeFilter,
      });
      logs = convertDatarowsToLogs(await client.sql(request, undefined, abortSignal), convertOptions);
      executedQueryString = `POST /_plugins/_sql ${JSON.stringify(request)}`;
      break;
    }
    case 'lucene':
    case 'dsl': {
      const body =
        language === 'lucene'
          ? buildLuceneSearchBody(query, start, end, searchOptions)
          : buildDslSearchBody(query, start, end, searchOptions);
      const index = resolvedIndex as string;
      logs = convertHitsToLogs(await client.search({ index, body }, undefined, abortSignal), convertOptions);
      executedQueryString = `POST /${index}/_search ${JSON.stringify(body)}`;
      break;
    }
    default: {
      const boundedQuery = buildBoundedPPL(query, start, end, {
        index: resolvedIndex,
        timestampField: spec.timestampField,
        disableTimeFilter: spec.disableTimeFilter,
      });
      logs = convertDatarowsToLogs(await client.ppl({ query: boundedQuery }, undefined, abortSignal), convertOptions);
      executedQueryString = boundedQuery;
      break;
    }
  }

  return { logs, timeRange: { start, end }, metadata: { executedQueryString } };
};
