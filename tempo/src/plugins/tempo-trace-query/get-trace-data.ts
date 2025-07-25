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

import { AbsoluteTimeRange, isValidTraceId, otlptracev1, TraceSearchResult } from '@perses-dev/core';
import { datasourceSelectValueToSelector, TraceQueryPlugin } from '@perses-dev/plugin-system';
import { getUnixTime } from 'date-fns';
import { TEMPO_DATASOURCE_KIND, TempoDatasourceSelector, TempoTraceQuerySpec } from '../../model';
import { QueryResponse, SearchRequestParameters, SearchResponse } from '../../model/api-types';
import { TempoClient } from '../../model/tempo-client';

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

  const listDatasourceSelectItems = await context.datasourceStore.listDatasourceSelectItems(TEMPO_DATASOURCE_KIND);
  const datasourceSelector =
    datasourceSelectValueToSelector(spec.datasource, context.variableState, listDatasourceSelectItems) ??
    defaultTempoDatasource;

  const client = await context.datasourceStore.getDatasourceClient<TempoClient>(datasourceSelector);

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
  const trace = {
    resourceSpans: response.batches,
  };

  // Tempo returns Trace ID and Span ID base64-encoded.
  // The OTLP spec defines the encoding in the hex format:
  // Spec: https://opentelemetry.io/docs/specs/otlp/#json-protobuf-encoding
  // Example: https://github.com/open-telemetry/opentelemetry-proto/blob/v1.7.0/examples/trace.json
  // Therefore, let's convert it to hex encoding.
  for (const resourceSpan of trace.resourceSpans) {
    for (const scopeSpan of resourceSpan.scopeSpans) {
      for (const span of scopeSpan.spans) {
        if (span.traceId.length != 32) {
          span.traceId = base64ToHex(span.traceId);
        }
        if (span.spanId.length != 16) {
          span.spanId = base64ToHex(span.spanId);
        }
        if (span.parentSpanId && span.parentSpanId.length != 16) {
          span.parentSpanId = base64ToHex(span.parentSpanId);
        }

        for (const link of span.links ?? []) {
          if (link.traceId.length != 32) {
            link.traceId = base64ToHex(link.traceId);
          }
          if (link.spanId.length != 16) {
            link.spanId = base64ToHex(link.spanId);
          }
        }
      }
    }
  }

  return trace;
}

function base64ToHex(str: string) {
  try {
    return atob(str)
      .split('')
      .map((char) => char.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase())
      .join('');
  } catch {
    return str;
  }
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
