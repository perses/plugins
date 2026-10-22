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

import type * as otlpcommonv1 from '@perses-dev/spec/dist/dashboard/query-type/otlp/common/v1/common';

import type {
  JaegerApiResponse,
  JaegerOperation,
  JaegerOtlpResourceSpans,
  JaegerOtlpSpan,
  JaegerSearchRequestParameters,
  JaegerTracesData,
} from './api-types';

/**
 * Support for the Jaeger query API v1 (`/api/traces`, `/api/services`, `/api/operations`), which Jaeger removed in 2.21.
 * It is only used when the Perses proxy of an existing datasource rejects the API v3 paths, because the datasource was
 * saved with the previous list of allowed endpoints.
 */

interface LegacyEnvelope<T> {
  data?: T;
  errors?: Array<{ msg: string }> | null;
}

type LegacyTag =
  | { key: string; type: 'string'; value: string }
  | { key: string; type: 'bool'; value: boolean }
  | { key: string; type: 'int64'; value: number }
  | { key: string; type: 'float64'; value: number }
  | { key: string; type: 'binary'; value: string };

interface LegacyProcess {
  serviceName: string;
  tags?: LegacyTag[];
}

interface LegacySpan {
  traceID: string;
  spanID: string;
  operationName: string;
  references?: Array<{ refType: string; traceID: string; spanID: string }>;
  startTime: number;
  duration: number;
  tags?: LegacyTag[];
  logs?: Array<{ timestamp: number; fields?: LegacyTag[] }>;
  processID?: string;
  process?: LegacyProcess;
}

interface LegacyTrace {
  traceID: string;
  spans: LegacySpan[];
  processes?: Record<string, LegacyProcess>;
}

export const LEGACY_TRACES_PATH = '/api/traces';
export const LEGACY_SERVICES_PATH = '/api/services';
export const LEGACY_OPERATIONS_PATH = '/api/operations';

// The API v1 parses the tags as a map of strings, so numbers and booleans are converted like the API v3 attributes.
function stringifyTags(tags: string): string {
  const parsed = JSON.parse(tags) as Record<string, string | number | boolean>;
  return JSON.stringify(Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, String(value)])));
}

export function buildLegacySearchParams(params: JaegerSearchRequestParameters): URLSearchParams {
  const urlSearchParams = new URLSearchParams();
  const entries: Record<string, string | undefined> = {
    service: params.service,
    operation: params.operation,
    spanKind: params.spanKind,
    tags: params.tags === undefined ? undefined : stringifyTags(params.tags),
    minDuration: params.minDuration,
    maxDuration: params.maxDuration,
    limit: params.limit?.toString(),
    // The API v1 expects microseconds.
    start: (params.startTime.getTime() * 1000).toString(),
    end: (params.endTime.getTime() * 1000).toString(),
  };
  Object.entries(entries).forEach(([key, value]) => {
    if (value !== undefined) {
      urlSearchParams.append(key, value);
    }
  });
  return urlSearchParams;
}

export function legacyTracesToOTLP(response: LegacyEnvelope<LegacyTrace[]>): JaegerTracesData {
  const resourceSpans: JaegerOtlpResourceSpans[] = [];
  for (const trace of response.data ?? []) {
    const byProcess = new Map<string, JaegerOtlpResourceSpans>();
    for (const span of trace.spans ?? []) {
      const process = span.process ?? (span.processID ? trace.processes?.[span.processID] : undefined);
      const processID = span.processID ?? `process-${process?.serviceName ?? 'unknown'}`;
      let resourceSpan = byProcess.get(processID);
      if (resourceSpan === undefined) {
        resourceSpan = {
          resource: { attributes: buildResourceAttributes(process) },
          scopeSpans: [{ scope: {}, spans: [] }],
        };
        byProcess.set(processID, resourceSpan);
        resourceSpans.push(resourceSpan);
      }
      resourceSpan.scopeSpans?.[0]?.spans?.push(convertSpan(span));
    }
  }
  return { resourceSpans };
}

export function legacyErrorMessage(response: LegacyEnvelope<unknown>): string | undefined {
  return response.errors && response.errors.length > 0 ? response.errors.map((e) => e.msg).join('; ') : undefined;
}

export function legacyServices(response: LegacyEnvelope<string[]>): JaegerApiResponse<string[]> {
  return { data: response.data ?? [] };
}

export function legacyOperations(response: LegacyEnvelope<JaegerOperation[]>): JaegerApiResponse<JaegerOperation[]> {
  return { data: response.data ?? [] };
}

const SPAN_KINDS: Record<string, string> = {
  internal: 'SPAN_KIND_INTERNAL',
  server: 'SPAN_KIND_SERVER',
  client: 'SPAN_KIND_CLIENT',
  producer: 'SPAN_KIND_PRODUCER',
  consumer: 'SPAN_KIND_CONSUMER',
};

const STATUS_CODES: Record<string, string> = {
  unset: 'STATUS_CODE_UNSET',
  ok: 'STATUS_CODE_OK',
  error: 'STATUS_CODE_ERROR',
};

function buildResourceAttributes(process?: LegacyProcess): otlpcommonv1.KeyValue[] {
  const tags = (process?.tags ?? []).filter((tag) => tag.key !== 'service.name').map(convertTag);
  return [{ key: 'service.name', value: { stringValue: process?.serviceName ?? 'unknown' } }, ...tags];
}

function convertSpan(span: LegacySpan): JaegerOtlpSpan {
  const childOf = span.references?.find((reference) => reference.refType === 'CHILD_OF');
  const kindTag = tagValue(span.tags, 'span.kind');
  const statusCodeTag = tagValue(span.tags, 'otel.status_code');
  const statusMessageTag = tagValue(span.tags, 'otel.status_description');
  let statusCode: string | undefined = tagValue(span.tags, 'error') === true ? 'STATUS_CODE_ERROR' : undefined;
  if (typeof statusCodeTag === 'string') {
    statusCode = STATUS_CODES[statusCodeTag.toLowerCase()];
  }

  return {
    traceId: span.traceID.toLowerCase().padStart(32, '0'),
    spanId: span.spanID.toLowerCase().padStart(16, '0'),
    parentSpanId: childOf ? childOf.spanID.toLowerCase().padStart(16, '0') : undefined,
    name: span.operationName,
    kind: typeof kindTag === 'string' ? SPAN_KINDS[kindTag.toLowerCase()] : undefined,
    startTimeUnixNano: `${span.startTime * 1000}`,
    endTimeUnixNano: `${(span.startTime + span.duration) * 1000}`,
    attributes: (span.tags ?? []).map(convertTag),
    events: (span.logs ?? []).map((log) => ({
      timeUnixNano: `${log.timestamp * 1000}`,
      name: eventName(log.fields),
      attributes: (log.fields ?? []).map(convertTag),
    })),
    links: (span.references ?? [])
      .filter((reference) => reference.refType !== 'CHILD_OF')
      .map((reference) => ({
        traceId: reference.traceID.toLowerCase().padStart(32, '0'),
        spanId: reference.spanID.toLowerCase().padStart(16, '0'),
        attributes: [],
      })),
    status: {
      code: statusCode,
      message: typeof statusMessageTag === 'string' ? statusMessageTag : undefined,
    },
  } as JaegerOtlpSpan;
}

function eventName(fields?: LegacyTag[]): string {
  const field = fields?.find((f) => f.key === 'event' && f.type === 'string');
  return typeof field?.value === 'string' ? field.value : 'event';
}

function convertTag(tag: LegacyTag): otlpcommonv1.KeyValue {
  switch (tag.type) {
    case 'string':
      return { key: tag.key, value: { stringValue: tag.value } };
    case 'bool':
      return { key: tag.key, value: { boolValue: tag.value } };
    case 'int64':
      return { key: tag.key, value: { intValue: `${tag.value}` } };
    case 'float64':
      return { key: tag.key, value: { doubleValue: tag.value } };
    case 'binary':
      return { key: tag.key, value: { bytesValue: tag.value } };
    default:
      throw new Error(`Unsupported Jaeger tag type: ${(tag as LegacyTag).type}`);
  }
}

function tagValue(tags: LegacyTag[] | undefined, key: string): LegacyTag['value'] | undefined {
  return tags?.find((tag) => tag.key === key)?.value;
}
