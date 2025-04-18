// Copyright 2025 The Perses Authors
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

import { TraceQueryPlugin } from '@perses-dev/plugin-system';
import { TraceSearchResult, AbsoluteTimeRange, isValidTraceId, otlptracev1 } from '@perses-dev/core';
import { getUnixTime } from 'date-fns';
import { TempoTraceQuerySpec, TEMPO_DATASOURCE_KIND, TempoDatasourceSelector } from '../../model';
import { TempoClient } from '../../model/tempo-client';
import { SearchRequestParameters, QueryResponse, SearchResponse } from '../../model/api-types';

export function getUnixTimeRange(timeRange: AbsoluteTimeRange): { start: number; end: number } {
  const { start, end } = timeRange;
  return {
    start: Math.ceil(getUnixTime(start)),
    end: Math.ceil(getUnixTime(end)),
  };
}

export const getTraceData: TraceQueryPlugin<TempoTraceQuerySpec>['getTraceData'] = async (spec, context) => {
  if (spec.query === undefined || spec.query === null || spec.query === '') {
    // Do not make a request to the backend, instead return an empty TraceData
    console.error('TempoTraceQuery is undefined, null, or an empty string.');
    return { searchResult: [] };
  }

  const defaultTempoDatasource: TempoDatasourceSelector = {
    kind: TEMPO_DATASOURCE_KIND,
  };

  const client: TempoClient = await context.datasourceStore.getDatasourceClient(
    spec.datasource ?? defaultTempoDatasource
  );

  const getQuery = (): SearchRequestParameters => {
    const params: SearchRequestParameters = {
      q: spec.query,
    };

    // handle time range selection from UI drop down (e.g. last 5 minutes, last 1 hour )
    if (context.absoluteTimeRange) {
      const { start, end } = getUnixTimeRange(context.absoluteTimeRange);
      params.start = start;
      params.end = end;
    }

    if (spec.limit) {
      params.limit = spec.limit;
    }

    return params;
  };

  /**
   * determine type of query:
   * if the query is a valid traceId, fetch the trace by traceId
   * otherwise, execute a TraceQL query
   */
  if (isValidTraceId(spec.query)) {
    const response = await client.query({ traceId: spec.query });
    return {
      trace: parseTraceResponse(response),
      metadata: {
        executedQueryString: spec.query,
      },
    };
  } else {
    const response = await client.searchWithFallback(getQuery());
    return {
      searchResult: parseSearchResponse(response),
      metadata: {
        executedQueryString: spec.query,
      },
    };
  }
};

function parseTraceResponse(response: QueryResponse): otlptracev1.TracesData {
  return {
    resourceSpans: response.batches,
  };
}

function parseSearchResponse(response: SearchResponse): TraceSearchResult[] {
  return response.traces.map((trace) => ({
    startTimeUnixMs: parseInt(trace.startTimeUnixNano) * 1e-6, // convert to millisecond for eChart time format,
    durationMs: trace.durationMs ?? 0, // Tempo API doesn't return 0 values
    traceId: trace.traceID,
    rootServiceName: trace.rootServiceName,
    rootTraceName: trace.rootTraceName,
    serviceStats: trace.serviceStats || {},
  }));
}
