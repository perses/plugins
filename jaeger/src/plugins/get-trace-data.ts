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

import { AbsoluteTimeRange, Notice, otlpcommonv1, otlptracev1, TraceSearchResult } from '@perses-dev/core';
import {
  datasourceSelectValueToSelector,
  replaceVariables,
  TraceQueryPlugin,
  VariableStateMap,
} from '@perses-dev/plugin-system';
import {
  DEFAULT_JAEGER,
  DEFAULT_SEARCH_LIMIT,
  JAEGER_DATASOURCE_KIND,
  JaegerApiResponse,
  JaegerClient,
  JaegerLog,
  JaegerProcess,
  JaegerReference,
  JaegerSearchRequestParameters,
  JaegerSpan,
  JaegerTag,
  JaegerTrace,
  JaegerTraceQuerySpec,
} from '../model';

const TRACE_ID_PATTERN = /^[a-fA-F0-9]{16}(?:[a-fA-F0-9]{16})?$/;

const SPAN_KIND_MAP: Record<string, otlptracev1.Span['kind']> = {
  unspecified: 'SPAN_KIND_UNSPECIFIED',
  internal: 'SPAN_KIND_INTERNAL',
  server: 'SPAN_KIND_SERVER',
  client: 'SPAN_KIND_CLIENT',
  producer: 'SPAN_KIND_PRODUCER',
  consumer: 'SPAN_KIND_CONSUMER',
};

const STATUS_CODE_MAP: Record<string, otlptracev1.Status['code']> = {
  unset: 'STATUS_CODE_UNSET',
  ok: 'STATUS_CODE_OK',
  error: 'STATUS_CODE_ERROR',
};

export function getTraceDataTimeRange(timeRange: AbsoluteTimeRange): { start: number; end: number } {
  return {
    start: timeRange.start.getTime() * 1000,
    end: timeRange.end.getTime() * 1000,
  };
}

export const getTraceData: TraceQueryPlugin<JaegerTraceQuerySpec>['getTraceData'] = async (spec, context) => {
  const resolvedSpec = resolveSpec(spec, context.variableState);

  const listDatasourceSelectItems = await context.datasourceStore.listDatasourceSelectItems(JAEGER_DATASOURCE_KIND);
  const datasourceSelector =
    datasourceSelectValueToSelector(spec.datasource, context.variableState, listDatasourceSelectItems) ??
    DEFAULT_JAEGER;
  const client = await context.datasourceStore.getDatasourceClient<JaegerClient>(datasourceSelector);

  if (resolvedSpec.traceId !== undefined) {
    const response = await client.getTrace(resolvedSpec.traceId);
    const trace = pickSingleTrace(response, resolvedSpec.traceId);
    return {
      trace: jaegerTraceToOTLP(trace),
      metadata: {
        executedQueryString: resolvedSpec.traceId,
      },
    };
  }

  if (resolvedSpec.service === undefined) {
    throw new Error('Jaeger trace searches require a service when Trace ID is not provided.');
  }

  const searchParams: JaegerSearchRequestParameters = {
    service: resolvedSpec.service,
    operation: resolvedSpec.operation,
    spanKind: resolvedSpec.spanKind,
    tags: resolvedSpec.tags,
    minDuration: resolvedSpec.minDuration,
    maxDuration: resolvedSpec.maxDuration,
    limit: (resolvedSpec.limit ?? DEFAULT_SEARCH_LIMIT) + 1,
  };

  if (context.absoluteTimeRange) {
    const { start, end } = getTraceDataTimeRange(context.absoluteTimeRange);
    searchParams.start = start;
    searchParams.end = end;
  }

  const response = await client.searchTraces(searchParams);
  const limit = resolvedSpec.limit ?? DEFAULT_SEARCH_LIMIT;
  const searchResult = (response.data ?? []).map(summarizeTrace);
  const hasMoreResults = searchResult.length > limit;
  const notices: Notice[] = [];
  if (response.errors && response.errors.length > 0) {
    notices.push({
      type: 'warning',
      message: response.errors.map((error) => error.msg).join('; '),
    });
  }
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

function resolveSpec(
  spec: JaegerTraceQuerySpec,
  variableState: VariableStateMap
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
      }).filter(([, value]) => value !== undefined && value !== '')
    )
  );
}

function pickSingleTrace(response: JaegerApiResponse<JaegerTrace[]>, traceId: string): JaegerTrace {
  const trace = response.data?.[0];
  if (trace) {
    return trace;
  }

  const errorMessage = response.errors?.map((error) => error.msg).join('; ') ?? `Trace ${traceId} was not found.`;
  throw new Error(errorMessage);
}

function trimToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function summarizeTrace(trace: JaegerTrace): TraceSearchResult {
  const spans = trace.spans ?? [];
  const rootSpan = findRootSpan(spans);
  const { startTimeUnixMs, endTimeUnixMs } = getTraceBounds(spans);
  const process = rootSpan ? resolveProcess(trace, rootSpan) : undefined;

  return {
    traceId: trace.traceID,
    startTimeUnixMs,
    durationMs: endTimeUnixMs - startTimeUnixMs,
    rootServiceName: process?.serviceName ?? 'unknown',
    rootTraceName: rootSpan?.operationName ?? trace.traceID,
    serviceStats: buildServiceStats(trace),
  };
}

function getTraceBounds(spans: JaegerSpan[]): { startTimeUnixMs: number; endTimeUnixMs: number } {
  if (spans.length === 0) {
    return { startTimeUnixMs: 0, endTimeUnixMs: 0 };
  }

  const [startTime, endTime] = spans.reduce<[number, number]>(
    (acc, span) => [Math.min(acc[0], span.startTime), Math.max(acc[1], span.startTime + span.duration)],
    [spans[0]!.startTime, spans[0]!.startTime + spans[0]!.duration]
  );

  return {
    startTimeUnixMs: startTime / 1000,
    endTimeUnixMs: endTime / 1000,
  };
}

function buildServiceStats(trace: JaegerTrace): TraceSearchResult['serviceStats'] {
  return trace.spans.reduce<Record<string, { spanCount: number; errorCount?: number }>>((acc, span) => {
    const serviceName = resolveProcess(trace, span)?.serviceName ?? 'unknown';
    const stats = acc[serviceName] ?? { spanCount: 0 };
    stats.spanCount += 1;
    if (isErrorSpan(span)) {
      stats.errorCount = (stats.errorCount ?? 0) + 1;
    }
    acc[serviceName] = stats;
    return acc;
  }, {});
}

export function jaegerTraceToOTLP(trace: JaegerTrace): otlptracev1.TracesData {
  const resourceSpanByProcessID = new Map<string, otlptracev1.ResourceSpan>();

  for (const span of trace.spans ?? []) {
    const processID = span.processID ?? `process-${resolveProcess(trace, span)?.serviceName ?? 'unknown'}`;
    const process = resolveProcess(trace, span);
    const resourceSpan = getOrCreateResourceSpan(resourceSpanByProcessID, processID, process);
    const scopeSpan = resourceSpan.scopeSpans[0]!;
    scopeSpan.spans.push(convertSpan(span));
  }

  return {
    resourceSpans: Array.from(resourceSpanByProcessID.values()),
  };
}

function getOrCreateResourceSpan(
  resourceSpanByProcessID: Map<string, otlptracev1.ResourceSpan>,
  processID: string,
  process?: JaegerProcess
): otlptracev1.ResourceSpan {
  const existing = resourceSpanByProcessID.get(processID);
  if (existing) {
    return existing;
  }

  const next: otlptracev1.ResourceSpan = {
    resource: {
      attributes: buildResourceAttributes(process),
    },
    scopeSpans: [
      {
        scope: {},
        spans: [],
      },
    ],
  };
  resourceSpanByProcessID.set(processID, next);
  return next;
}

function buildResourceAttributes(process?: JaegerProcess): otlpcommonv1.KeyValue[] {
  const serviceName = process?.serviceName ?? 'unknown';
  const processTags = (process?.tags ?? []).filter((tag) => tag.key !== 'service.name').map(convertTag);
  return [{ key: 'service.name', value: { stringValue: serviceName } }, ...processTags];
}

function convertSpan(span: JaegerSpan): otlptracev1.Span {
  const childOfReference = span.references?.find((reference) => reference.refType === 'CHILD_OF');
  const spanKindTag = getTagValue(span.tags, 'span.kind');
  const statusCodeTag = getTagValue(span.tags, 'otel.status_code');
  const statusDescriptionTag = getTagValue(span.tags, 'otel.status_description');

  return {
    traceId: normalizeTraceId(span.traceID),
    spanId: normalizeSpanId(span.spanID),
    parentSpanId: childOfReference ? normalizeSpanId(childOfReference.spanID) : undefined,
    name: span.operationName,
    kind: spanKindTag && typeof spanKindTag === 'string' ? SPAN_KIND_MAP[spanKindTag.toLowerCase()] : undefined,
    startTimeUnixNano: `${span.startTime * 1000}`,
    endTimeUnixNano: `${(span.startTime + span.duration) * 1000}`,
    attributes: (span.tags ?? []).map(convertTag),
    events: (span.logs ?? []).map(convertLog),
    links: buildLinks(span.references),
    status: {
      code:
        statusCodeTag && typeof statusCodeTag === 'string'
          ? STATUS_CODE_MAP[statusCodeTag.toLowerCase()]
          : isErrorSpan(span)
            ? 'STATUS_CODE_ERROR'
            : undefined,
      message: typeof statusDescriptionTag === 'string' ? statusDescriptionTag : undefined,
    },
  };
}

function buildLinks(references?: JaegerReference[]): otlptracev1.Link[] {
  return (references ?? [])
    .filter((reference) => reference.refType !== 'CHILD_OF')
    .map((reference) => ({
      traceId: normalizeTraceId(reference.traceID),
      spanId: normalizeSpanId(reference.spanID),
      attributes: [],
    }));
}

function convertLog(log: JaegerLog): otlptracev1.Event {
  return {
    timeUnixNano: `${log.timestamp * 1000}`,
    name: getEventName(log),
    attributes: (log.fields ?? []).map(convertTag),
  };
}

function getEventName(log: JaegerLog): string {
  const eventField = log.fields?.find((field) => field.key === 'event' && field.type === 'string');
  return typeof eventField?.value === 'string' ? eventField.value : 'event';
}

function convertTag(tag: JaegerTag): otlpcommonv1.KeyValue {
  return {
    key: tag.key,
    value: convertAnyValue(tag),
  };
}

function convertAnyValue(tag: JaegerTag): otlpcommonv1.AnyValue {
  switch (tag.type) {
    case 'string':
      return { stringValue: tag.value };
    case 'bool':
      return { boolValue: tag.value };
    case 'int64':
      return { intValue: `${tag.value}` };
    case 'float64':
      return { doubleValue: tag.value };
    case 'binary':
      return { bytesValue: tag.value };
    default:
      throw new Error(`Unsupported Jaeger tag type: ${(tag as JaegerTag).type}`);
  }
}

function resolveProcess(trace: JaegerTrace, span: JaegerSpan): JaegerProcess | undefined {
  return span.process ?? (span.processID ? trace.processes?.[span.processID] : undefined);
}

function findRootSpan(spans: JaegerSpan[]): JaegerSpan | undefined {
  return spans.find((span) => !span.references?.some((reference) => reference.refType === 'CHILD_OF')) ?? spans[0];
}

function normalizeTraceId(traceId: string): string {
  return traceId.toLowerCase().padStart(32, '0');
}

function normalizeSpanId(spanId: string): string {
  return spanId.toLowerCase().padStart(16, '0');
}

function isErrorSpan(span: JaegerSpan): boolean {
  const errorTag = getTagValue(span.tags, 'error');
  if (errorTag === true) {
    return true;
  }

  const statusCodeTag = getTagValue(span.tags, 'otel.status_code');
  return typeof statusCodeTag === 'string' && statusCodeTag.toLowerCase() === 'error';
}

function getTagValue(tags: JaegerTag[] | undefined, key: string): JaegerTag['value'] | undefined {
  return tags?.find((tag) => tag.key === key)?.value;
}
