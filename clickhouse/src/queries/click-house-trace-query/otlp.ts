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

import type { otlpcommonv1, otlptracev1 } from '@perses-dev/spec';

import type { ClickHouseQueryResponse } from '../../model/click-house-client';
import type { ClickHouseColumn } from '../../model/click-house-types';
import { findColumn, getTypeTimeZone } from '../../model/click-house-types';
import { isRecord, toText, toUnixNano } from '../../model/values';

const SPAN_KINDS = new Set(['INTERNAL', 'SERVER', 'CLIENT', 'PRODUCER', 'CONSUMER']);
const SERVICE_NAME = 'service.name';

function toAnyValue(value: unknown): otlpcommonv1.AnyValue {
  if (typeof value === 'boolean') return { boolValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { intValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toAnyValue) } };
  return { stringValue: toText(value) };
}

/**
 * toAttributes converts an attribute column. With the default schema it is a map of strings. With the JSON schema
 * of the exporter the values keep their type, and ClickHouse nests the dotted names (`http.method` comes back as
 * `{http: {method: ...}}`): they are flattened back.
 */
function toAttributes(value: unknown, prefix = '', result: otlpcommonv1.KeyValue[] = []): otlpcommonv1.KeyValue[] {
  if (!isRecord(value)) return result;
  for (const key of Object.keys(value)) {
    const item = value[key];
    if (isRecord(item)) {
      toAttributes(item, `${prefix}${key}.`, result);
    } else if (item !== null && item !== undefined) {
      result.push({ key: `${prefix}${key}`, value: toAnyValue(item) });
    }
  }
  return result;
}

function toStatusCode(value: unknown): otlptracev1.Status['code'] {
  const status = toText(value).toUpperCase();
  if (status === 'ERROR' || status === 'STATUS_CODE_ERROR' || status === '2') return 'STATUS_CODE_ERROR';
  if (status === 'OK' || status === 'STATUS_CODE_OK' || status === '1') return 'STATUS_CODE_OK';
  return 'STATUS_CODE_UNSET';
}

function toSpanKind(value: unknown): string {
  const kind = toText(value)
    .toUpperCase()
    .replace(/^SPAN_KIND_/, '');
  return SPAN_KINDS.has(kind) ? `SPAN_KIND_${kind}` : 'SPAN_KIND_UNSPECIFIED';
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

interface SpanColumns {
  timestamp: number;
  traceId: number;
  spanId: number;
  parentSpanId: number;
  spanName: number;
  spanKind: number;
  serviceName: number;
  resourceAttributes: number;
  scopeName: number;
  scopeVersion: number;
  spanAttributes: number;
  duration: number;
  statusCode: number;
  statusMessage: number;
  eventTimestamps: number;
  eventNames: number;
  eventAttributes: number;
  linkTraceIds: number;
  linkSpanIds: number;
  linkAttributes: number;
}

function findSpanColumns(columns: ClickHouseColumn[]): SpanColumns {
  const index = (name: string): number => findColumn(columns, [name]);
  const required = (name: string): number => {
    const found = index(name.toLowerCase());
    if (found === -1) {
      throw new Error(`The trace table has no "${name}" column: it must follow the OpenTelemetry schema.`);
    }
    return found;
  };
  return {
    timestamp: required('Timestamp'),
    traceId: required('TraceId'),
    spanId: required('SpanId'),
    duration: required('Duration'),
    parentSpanId: index('parentspanid'),
    spanName: index('spanname'),
    spanKind: index('spankind'),
    serviceName: index('servicename'),
    resourceAttributes: index('resourceattributes'),
    scopeName: index('scopename'),
    scopeVersion: index('scopeversion'),
    spanAttributes: index('spanattributes'),
    statusCode: index('statuscode'),
    statusMessage: index('statusmessage'),
    eventTimestamps: index('events.timestamp'),
    eventNames: index('events.name'),
    eventAttributes: index('events.attributes'),
    linkTraceIds: index('links.traceid'),
    linkSpanIds: index('links.spanid'),
    linkAttributes: index('links.attributes'),
  };
}

/**
 * buildTrace converts the spans of a trace, as stored by the ClickHouse exporter of the OpenTelemetry Collector,
 * into an OTLP trace: spans grouped by resource, then by instrumentation scope.
 */
export function buildTrace(response: ClickHouseQueryResponse): otlptracev1.TracesData {
  const { columns, rows } = response;
  const span = findSpanColumns(columns);
  const timeZone = getTypeTimeZone(columns[span.timestamp]?.type ?? '') ?? response.timeZone;
  const resources = new Map<
    string,
    { resourceSpan: otlptracev1.ResourceSpan; scopes: Map<string, otlptracev1.Span[]> }
  >();

  for (const row of rows) {
    const start = toUnixNano(row[span.timestamp], timeZone);
    if (start === undefined) continue;
    let duration = 0n;
    try {
      duration = BigInt(toText(row[span.duration]) || '0');
    } catch {
      // Not an integer number of nanoseconds: the span is displayed without a duration.
    }

    const serviceName = toText(row[span.serviceName]);
    const resourceAttributes = toAttributes(row[span.resourceAttributes]);
    if (serviceName && !resourceAttributes.some((attribute) => attribute.key === SERVICE_NAME)) {
      resourceAttributes.push({ key: SERVICE_NAME, value: { stringValue: serviceName } });
    }
    // Attributes are sorted in the key: ClickHouse does not always return the keys of a map in the same order.
    const resourceKey = JSON.stringify(resourceAttributes.toSorted((a, b) => (a.key < b.key ? -1 : 1)));
    let resource = resources.get(resourceKey);
    if (!resource) {
      resource = { resourceSpan: { resource: { attributes: resourceAttributes }, scopeSpans: [] }, scopes: new Map() };
      resources.set(resourceKey, resource);
    }

    const scopeName = toText(row[span.scopeName]);
    const scopeVersion = toText(row[span.scopeVersion]);
    const scopeKey = JSON.stringify([scopeName, scopeVersion]);
    let spans = resource.scopes.get(scopeKey);
    if (!spans) {
      spans = [];
      resource.scopes.set(scopeKey, spans);
      resource.resourceSpan.scopeSpans.push({ scope: { name: scopeName, version: scopeVersion }, spans });
    }

    const eventTimestamps = toArray(row[span.eventTimestamps]);
    const eventAttributes = toArray(row[span.eventAttributes]);
    const linkSpanIds = toArray(row[span.linkSpanIds]);
    const linkAttributes = toArray(row[span.linkAttributes]);
    const parentSpanId = toText(row[span.parentSpanId]).toLowerCase();
    const statusMessage = toText(row[span.statusMessage]);

    spans.push({
      traceId: toText(row[span.traceId]).toLowerCase(),
      spanId: toText(row[span.spanId]).toLowerCase(),
      ...(parentSpanId && { parentSpanId }),
      name: toText(row[span.spanName]),
      kind: toSpanKind(row[span.spanKind]),
      startTimeUnixNano: String(start),
      endTimeUnixNano: String(start + duration),
      attributes: toAttributes(row[span.spanAttributes]),
      events: toArray(row[span.eventNames]).map((name, position) => ({
        name: toText(name),
        timeUnixNano: String(toUnixNano(eventTimestamps[position], timeZone) ?? start),
        attributes: toAttributes(eventAttributes[position]),
      })),
      links: toArray(row[span.linkTraceIds]).map((traceId, position) => ({
        traceId: toText(traceId).toLowerCase(),
        spanId: toText(linkSpanIds[position]).toLowerCase(),
        attributes: toAttributes(linkAttributes[position]),
      })),
      status: { code: toStatusCode(row[span.statusCode]), ...(statusMessage && { message: statusMessage }) },
    });
  }

  return { resourceSpans: [...resources.values()].map(({ resourceSpan }) => resourceSpan) };
}
