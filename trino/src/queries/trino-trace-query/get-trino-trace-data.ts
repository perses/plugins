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
import { replaceVariables } from '@perses-dev/plugin-system';
import type { Notice, ServiceStats, TraceSearchResult, otlpcommonv1, otlptracev1 } from '@perses-dev/spec';

import type { TrinoClient } from '../../model/trino-client';
import { TRUNCATED_NOTICE, formatTrinoDateTime, replaceTimeRangePlaceholders } from '../../model/trino-client';
import { DEFAULT_DATASOURCE } from '../constants';
import { interpolateQueryContext } from '../query-context';
import type { TrinoSpan } from './trino-span-rows';
import { parseSpans, skippedNotice } from './trino-span-rows';
import type { TrinoTraceQuerySpec } from './trino-trace-query-types';

const NANOS_PER_MS = 1_000_000;

/** groupByTrace groups spans by their trace_id. */
export function groupByTrace(spans: TrinoSpan[]): Map<string, TrinoSpan[]> {
  const traces = new Map<string, TrinoSpan[]>();
  for (const span of spans) {
    const group = traces.get(span.traceId);
    if (group) group.push(span);
    else traces.set(span.traceId, [span]);
  }
  return traces;
}

/** buildSearchResult builds one search result per trace, newest first. */
export function buildSearchResult(traces: Map<string, TrinoSpan[]>): TraceSearchResult[] {
  return Array.from(traces, ([traceId, spans]) => {
    const startNs = spans.reduce((min, span) => (span.startNs < min ? span.startNs : min), spans[0]!.startNs);
    const endNs = spans.reduce((max, span) => (span.endNs > max ? span.endNs : max), spans[0]!.endNs);
    const byStart = spans.toSorted((a, b) => Number(a.startNs - b.startNs));
    const root = byStart.find((span) => !span.parentSpanId) ?? byStart[0]!;

    // A Map keeps service names such as __proto__ from touching Object.prototype.
    const stats = new Map<string, ServiceStats>();
    for (const span of spans) {
      const entry = stats.get(span.serviceName) ?? { spanCount: 0 };
      entry.spanCount += 1;
      if (span.isError) entry.errorCount = (entry.errorCount ?? 0) + 1;
      stats.set(span.serviceName, entry);
    }

    return {
      traceId,
      startTimeUnixMs: Number(startNs / BigInt(NANOS_PER_MS)),
      durationMs: Number(endNs - startNs) / NANOS_PER_MS,
      rootServiceName: root.serviceName,
      rootTraceName: root.spanName,
      serviceStats: Object.fromEntries(stats),
    };
  }).toSorted((a, b) => b.startTimeUnixMs - a.startTimeUnixMs);
}

function buildTrace(spans: TrinoSpan[]): otlptracev1.TracesData {
  const byService = new Map<
    string,
    { resourceAttributes: otlpcommonv1.KeyValue[]; scopes: Map<string, otlptracev1.ScopeSpans> }
  >();

  for (const span of spans) {
    let service = byService.get(span.serviceName);
    if (!service) {
      service = {
        resourceAttributes: [
          { key: 'service.name', value: { stringValue: span.serviceName } },
          ...span.resourceAttributes,
        ],
        scopes: new Map(),
      };
      byService.set(span.serviceName, service);
    }
    const scopeKey = `${span.scopeName}|${span.scopeVersion}`;
    let scope = service.scopes.get(scopeKey);
    if (!scope) {
      scope = { scope: { name: span.scopeName, version: span.scopeVersion }, spans: [] };
      service.scopes.set(scopeKey, scope);
    }
    scope.spans.push({
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      name: span.spanName,
      kind: span.kind,
      startTimeUnixNano: span.startNs.toString(),
      endTimeUnixNano: span.endNs.toString(),
      attributes: span.attributes,
      status: span.status,
    });
  }

  return {
    resourceSpans: Array.from(byService.values(), (service) => ({
      resource: { attributes: service.resourceAttributes },
      scopeSpans: Array.from(service.scopes.values()),
    })),
  };
}

/** getTrinoTraceData runs the query and returns search results, or only the full trace for a single trace_id. */
export const getTrinoTraceData: TraceQueryPlugin<TrinoTraceQuerySpec>['getTraceData'] = async (
  spec,
  context,
  abortSignal,
) => {
  if (spec.query === undefined || spec.query === null || spec.query.trim() === '') {
    return { searchResult: [] };
  }

  const client = (await context.datasourceStore.getDatasourceClient(
    spec.datasource ?? DEFAULT_DATASOURCE,
  )) as TrinoClient;

  const variableQuery = replaceVariables(spec.query, context.variableState);
  const start = context.absoluteTimeRange && formatTrinoDateTime(context.absoluteTimeRange.start);
  const end = context.absoluteTimeRange && formatTrinoDateTime(context.absoluteTimeRange.end);
  const executedQueryString = replaceTimeRangePlaceholders(variableQuery, start, end);

  const response = await client.query({
    start,
    end,
    query: executedQueryString,
    ...interpolateQueryContext(spec, context.variableState),
    fullPrecisionTimestamps: true,
    signal: abortSignal,
  });

  const { spans, skipped } = parseSpans(response);
  const traces = groupByTrace(spans);
  const notices: Notice[] = [];
  if (response.truncated) notices.push(TRUNCATED_NOTICE);
  if (skipped > 0) notices.push(skippedNotice(skipped));

  const metadata = {
    executedQueryString,
    ...(notices.length > 0 && { notices }),
    ...(response.truncated && { hasMoreResults: true }),
  };
  // The TracingGanttChart refuses a result with search results, so one trace_id returns only the trace.
  if (traces.size === 1) return { trace: buildTrace(spans), metadata };
  return { searchResult: buildSearchResult(traces), metadata };
};
