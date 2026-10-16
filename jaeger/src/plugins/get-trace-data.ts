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

import type { TraceQueryPlugin, VariableStateMap } from '@perses-dev/plugin-system';
import { datasourceSelectValueToSelector, replaceVariables } from '@perses-dev/plugin-system';
import type { AbsoluteTimeRange, Notice, TraceSearchResult } from '@perses-dev/spec';
import type * as otlptracev1 from '@perses-dev/spec/dist/dashboard/query-type/otlp/trace/v1/trace';

import type {
  JaegerClient,
  JaegerOtlpSpan,
  JaegerSearchRequestParameters,
  JaegerTraceQuerySpec,
  JaegerTracesData,
} from '../model';
import { DEFAULT_JAEGER, DEFAULT_SEARCH_LIMIT, JAEGER_DATASOURCE_KIND, JaegerRequestError } from '../model';

const TRACE_ID_PATTERN = /^[a-fA-F0-9]{16}(?:[a-fA-F0-9]{16})?$/;

// Jaeger API v3 requires a start time range. It is used when the query has no time range.
const DEFAULT_SEARCH_WINDOW_MS = 60 * 60 * 1000;

// Jaeger serializes OTLP enums as numbers, whereas Perses uses the names.
const SPAN_KIND_NAMES: Record<number, otlptracev1.Span['kind']> = {
  0: 'SPAN_KIND_UNSPECIFIED',
  1: 'SPAN_KIND_INTERNAL',
  2: 'SPAN_KIND_SERVER',
  3: 'SPAN_KIND_CLIENT',
  4: 'SPAN_KIND_PRODUCER',
  5: 'SPAN_KIND_CONSUMER',
};

const STATUS_CODE_NAMES: Record<number, otlptracev1.Status['code']> = {
  0: 'STATUS_CODE_UNSET',
  1: 'STATUS_CODE_OK',
  2: 'STATUS_CODE_ERROR',
};

export function getTraceDataTimeRange(timeRange?: AbsoluteTimeRange): { startTime: Date; endTime: Date } {
  if (timeRange) {
    return { startTime: timeRange.start, endTime: timeRange.end };
  }

  const endTime = new Date();
  return { startTime: new Date(endTime.getTime() - DEFAULT_SEARCH_WINDOW_MS), endTime };
}

export const getTraceData: TraceQueryPlugin<JaegerTraceQuerySpec>['getTraceData'] = async (spec, context) => {
  const resolvedSpec = resolveSpec(spec, context.variableState);

  const listDatasourceSelectItems = await context.datasourceStore.listDatasourceSelectItems(JAEGER_DATASOURCE_KIND);
  const datasourceSelector =
    datasourceSelectValueToSelector(spec.datasource, context.variableState, listDatasourceSelectItems) ??
    DEFAULT_JAEGER;
  const client = await context.datasourceStore.getDatasourceClient<JaegerClient>(datasourceSelector);

  if (resolvedSpec.traceId !== undefined) {
    const tracesData = await getSingleTrace(client, resolvedSpec.traceId);
    return {
      trace: normalizeTracesData(tracesData),
      metadata: {
        executedQueryString: resolvedSpec.traceId,
      },
    };
  }

  if (resolvedSpec.service === undefined) {
    throw new Error('Jaeger trace searches require a service when Trace ID is not provided.');
  }

  const limit = resolvedSpec.limit ?? DEFAULT_SEARCH_LIMIT;
  const searchParams: JaegerSearchRequestParameters = {
    service: resolvedSpec.service,
    operation: resolvedSpec.operation,
    spanKind: resolvedSpec.spanKind,
    tags: resolvedSpec.tags,
    minDuration: resolvedSpec.minDuration,
    maxDuration: resolvedSpec.maxDuration,
    // Ask for one more trace than needed to know whether there are more results.
    limit: limit + 1,
    ...getTraceDataTimeRange(context.absoluteTimeRange),
  };

  const tracesData = await client.searchTraces(searchParams);
  const searchResult = summarizeTraces(tracesData);
  const hasMoreResults = searchResult.length > limit;
  const notices: Notice[] = [];
  if (hasMoreResults) {
    notices.push({
      type: 'info',
      message: 'Not all matching traces are currently displayed. Increase the result limit to view additional traces.',
    });
    searchResult.splice(limit);
  }

  return {
    searchResult,
    metadata: {
      executedQueryString: buildExecutedQueryString(resolvedSpec),
      hasMoreResults,
      notices,
    },
  };
};

async function getSingleTrace(client: JaegerClient, traceId: string): Promise<JaegerTracesData> {
  const notFound = new Error(`Trace ${traceId} was not found.`);
  let tracesData: JaegerTracesData;
  try {
    tracesData = await client.getTrace(traceId);
  } catch (e) {
    throw e instanceof JaegerRequestError && e.status === 404 ? notFound : e;
  }

  if (tracesData.resourceSpans === undefined || tracesData.resourceSpans.length === 0) {
    throw notFound;
  }
  return tracesData;
}

function resolveSpec(
  spec: JaegerTraceQuerySpec,
  variableState: VariableStateMap,
): Omit<JaegerTraceQuerySpec, 'tags'> & { tags?: string } {
  const traceId = trimToUndefined(replaceVariables(spec.traceId ?? '', variableState));
  const service = trimToUndefined(replaceVariables(spec.service ?? '', variableState));
  const operation = trimToUndefined(replaceVariables(spec.operation ?? '', variableState));
  const spanKind = trimToUndefined(replaceVariables(spec.spanKind ?? '', variableState));
  const minDuration = trimToUndefined(replaceVariables(spec.minDuration ?? '', variableState));
  const maxDuration = trimToUndefined(replaceVariables(spec.maxDuration ?? '', variableState));
  const tagsRaw = trimToUndefined(replaceVariables(spec.tags ?? '', variableState));

  if (traceId !== undefined && !TRACE_ID_PATTERN.test(traceId)) {
    throw new Error('Jaeger trace IDs must be 16 or 32 hexadecimal characters.');
  }

  let tags: string | undefined = undefined;
  if (tagsRaw !== undefined) {
    let parsedTags: unknown;
    try {
      parsedTags = JSON.parse(tagsRaw);
    } catch {
      throw new Error('Jaeger tags must be a valid JSON object.');
    }
    if (parsedTags === null || Array.isArray(parsedTags) || typeof parsedTags !== 'object') {
      throw new Error('Jaeger tags must be a JSON object.');
    }
    tags = JSON.stringify(parsedTags);
  }

  return {
    ...spec,
    traceId,
    service,
    operation,
    spanKind,
    minDuration,
    maxDuration,
    tags,
  };
}

function buildExecutedQueryString(spec: JaegerTraceQuerySpec): string {
  if (spec.traceId) {
    return spec.traceId;
  }

  return JSON.stringify(
    Object.fromEntries(
      Object.entries({
        service: spec.service,
        operation: spec.operation,
        spanKind: spec.spanKind,
        tags: spec.tags,
        minDuration: spec.minDuration,
        maxDuration: spec.maxDuration,
        limit: spec.limit,
      }).filter(([, value]) => value !== undefined && value !== ''),
    ),
  );
}

function trimToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

interface SpanWithService {
  span: otlptracev1.Span;
  serviceName: string;
}

// Jaeger returns the spans of all matching traces together, so they have to be grouped by trace.
function summarizeTraces(tracesData: JaegerTracesData): TraceSearchResult[] {
  const spansByTraceId = new Map<string, SpanWithService[]>();
  for (const resourceSpan of normalizeTracesData(tracesData).resourceSpans) {
    const serviceName = getServiceName(resourceSpan);
    for (const scopeSpan of resourceSpan.scopeSpans) {
      for (const span of scopeSpan.spans) {
        const spans = spansByTraceId.get(span.traceId) ?? [];
        spans.push({ span, serviceName });
        spansByTraceId.set(span.traceId, spans);
      }
    }
  }

  return Array.from(spansByTraceId, ([traceId, spans]) => summarizeTrace(traceId, spans)).toSorted(
    (a, b) => b.startTimeUnixMs - a.startTimeUnixMs,
  );
}

function summarizeTrace(traceId: string, spans: SpanWithService[]): TraceSearchResult {
  const rootSpan = findRootSpan(spans);
  const startTimeUnixMs = Math.min(...spans.map(({ span }) => nanoToMs(span.startTimeUnixNano)));
  const endTimeUnixMs = Math.max(...spans.map(({ span }) => nanoToMs(span.endTimeUnixNano)));

  return {
    traceId,
    startTimeUnixMs,
    durationMs: endTimeUnixMs - startTimeUnixMs,
    rootServiceName: rootSpan.serviceName,
    rootTraceName: rootSpan.span.name,
    serviceStats: buildServiceStats(spans),
  };
}

function buildServiceStats(spans: SpanWithService[]): TraceSearchResult['serviceStats'] {
  return spans.reduce<Record<string, { spanCount: number; errorCount?: number }>>((acc, { span, serviceName }) => {
    const stats = acc[serviceName] ?? { spanCount: 0 };
    stats.spanCount += 1;
    if (isErrorSpan(span)) {
      stats.errorCount = (stats.errorCount ?? 0) + 1;
    }
    acc[serviceName] = stats;
    return acc;
  }, {});
}

// The root span is the earliest span without a parent in the trace.
function findRootSpan(spans: SpanWithService[]): SpanWithService {
  const spanIds = new Set(spans.map(({ span }) => span.spanId));
  const roots = spans.filter(({ span }) => span.parentSpanId === undefined || !spanIds.has(span.parentSpanId));
  const candidates = roots.length > 0 ? roots : spans;
  return candidates.reduce((earliest, current) =>
    nanoToMs(current.span.startTimeUnixNano) < nanoToMs(earliest.span.startTimeUnixNano) ? current : earliest,
  );
}

function getServiceName(resourceSpan: otlptracev1.ResourceSpan): string {
  const serviceName = resourceSpan.resource?.attributes?.find((attribute) => attribute.key === 'service.name');
  return serviceName && 'stringValue' in serviceName.value ? serviceName.value.stringValue : 'unknown';
}

function isErrorSpan(span: otlptracev1.Span): boolean {
  return (
    span.status?.code === 'STATUS_CODE_ERROR' ||
    (span.attributes ?? []).some(
      (attribute) => attribute.key === 'error' && 'boolValue' in attribute.value && attribute.value.boolValue,
    )
  );
}

// Nanosecond timestamps do not fit in a number without losing precision, hence the BigInt.
function nanoToMs(nanos: string): number {
  try {
    return Number(BigInt(nanos) / 1000n) / 1000;
  } catch {
    return 0;
  }
}

export function normalizeTracesData(tracesData: JaegerTracesData): otlptracev1.TracesData {
  return {
    resourceSpans: (tracesData.resourceSpans ?? []).map((resourceSpan) => ({
      resource: resourceSpan.resource,
      scopeSpans: (resourceSpan.scopeSpans ?? []).map((scopeSpan) => ({
        scope: scopeSpan.scope,
        spans: (scopeSpan.spans ?? []).map(normalizeSpan),
      })),
    })),
  };
}

function normalizeSpan(span: JaegerOtlpSpan): otlptracev1.Span {
  return {
    traceId: normalizeTraceId(span.traceId),
    spanId: normalizeSpanId(span.spanId),
    parentSpanId: span.parentSpanId ? normalizeSpanId(span.parentSpanId) : undefined,
    name: span.name,
    kind: normalizeEnum(span.kind, SPAN_KIND_NAMES),
    startTimeUnixNano: `${span.startTimeUnixNano}`,
    endTimeUnixNano: `${span.endTimeUnixNano}`,
    attributes: span.attributes,
    events: span.events,
    links: span.links?.map((link) => ({
      traceId: normalizeTraceId(link.traceId),
      spanId: normalizeSpanId(link.spanId),
      attributes: link.attributes,
    })),
    status: span.status
      ? { code: normalizeEnum(span.status.code, STATUS_CODE_NAMES), message: span.status.message }
      : undefined,
  };
}

function normalizeEnum<T extends string | undefined>(value: number | string | undefined, names: Record<number, T>): T {
  // Already a name, or unset.
  if (typeof value !== 'number') {
    return value as T;
  }
  return names[value] as T;
}

function normalizeTraceId(traceId: string): string {
  return traceId.toLowerCase().padStart(32, '0');
}

function normalizeSpanId(spanId: string): string {
  return spanId.toLowerCase().padStart(16, '0');
}
