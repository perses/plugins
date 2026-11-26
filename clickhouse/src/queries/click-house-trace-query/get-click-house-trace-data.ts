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

import type { TraceQueryPlugin } from '@perses-dev/plugin-system';
import type { Notice } from '@perses-dev/spec';
import { isValidTraceId } from '@perses-dev/spec';

import { ClickHouseError } from '../../model/click-house-client';
import type { ClickHouseQueryContext } from '../../model/execute-query';
import { prepareQuery, runStatement, truncationNotices } from '../../model/execute-query';
import { interpolateVariables } from '../../model/interpolation';
import type { ClickHouseTraceQuerySpec } from './click-house-trace-query-types';
import { DEFAULT_SEARCH_LIMIT, DEFAULT_TRACE_TABLE } from './click-house-trace-query-types';
import { buildTrace } from './otlp';
import { buildSearchResult, readMatchedTraces } from './search';
import { buildMatchQuery, buildSummaryQuery, buildTraceQuery } from './trace-sql';

const TRACE_ID_LENGTH = 32;
// Error code of ClickHouse for a column that does not exist.
const UNKNOWN_IDENTIFIER = 47;

export const getTraceData: TraceQueryPlugin<ClickHouseTraceQuerySpec>['getTraceData'] = async (
  spec,
  context,
  abortSignal,
) => {
  if (!spec.query?.trim()) {
    return { searchResult: [] };
  }

  const { datasourceStore, variableState } = context;
  const table = spec.table || DEFAULT_TRACE_TABLE;

  // As for the other trace datasources, a trace ID asks for the trace and anything else is a search.
  const traceId = interpolateVariables(spec.query, variableState).trim();
  if (traceId === '') {
    // A variable without a value, e.g. before a trace is selected: there is nothing to display yet.
    return {};
  }
  if (isValidTraceId(traceId)) {
    // The exporter stores trace IDs as 32 lower case hexadecimal digits.
    const normalizedTraceId = traceId.toLowerCase().padStart(TRACE_ID_LENGTH, '0');
    const statement = buildTraceQuery(table, normalizedTraceId);
    const result = await runStatement(spec.datasource, statement, context, abortSignal);
    if (result.rows.length === 0) {
      throw new Error(`Trace ${normalizedTraceId} was not found in ${table}.`);
    }
    const notices = truncationNotices(result);
    return {
      trace: buildTrace(result),
      metadata: { executedQueryString: statement, ...(notices.length > 0 && { notices }) },
    };
  }

  const queryContext: ClickHouseQueryContext = { datasourceStore, variableState, timeRange: context.absoluteTimeRange };
  const limit = spec.limit ?? DEFAULT_SEARCH_LIMIT;
  const matchStatement = buildMatchQuery(prepareQuery(spec.query, queryContext).sql, limit);
  let matched;
  try {
    matched = readMatchedTraces(await runStatement(spec.datasource, matchStatement, context, abortSignal), limit);
  } catch (error) {
    if (error instanceof ClickHouseError && error.code === UNKNOWN_IDENTIFIER) {
      throw new Error(
        `${error.message} A trace search query must return the "TraceId" and "Timestamp" columns of the spans to search for.`,
        { cause: error },
      );
    }
    throw error;
  }

  const { traceIds, hasMore: hasMoreResults } = matched;
  if (traceIds.length === 0) {
    return { searchResult: [], metadata: { executedQueryString: matchStatement } };
  }

  // The traces are summarized from all their spans, not only from the ones matched by the search.
  const summary = await runStatement(spec.datasource, buildSummaryQuery(table, traceIds), context, abortSignal);
  const notices: Notice[] = hasMoreResults
    ? [
        {
          type: 'info',
          message:
            'Not all matching traces are currently displayed. Increase the result limit to view additional traces.',
        },
      ]
    : [];

  return {
    searchResult: buildSearchResult(summary),
    metadata: { executedQueryString: matchStatement, hasMoreResults, ...(notices.length > 0 && { notices }) },
  };
};
