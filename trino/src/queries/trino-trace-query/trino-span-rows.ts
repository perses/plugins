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

import type { Notice } from '@perses-dev/spec';
import { otlptracev1 } from '@perses-dev/spec';

import type { TrinoColumn, TrinoQueryResponse } from '../../model/trino-client';
import { parseTrinoTimestampNanos } from '../../model/trino-client';

type KeyValue = NonNullable<otlptracev1.Span['attributes']>[number];
type AnyValue = KeyValue['value'];

/** Column names read from a trace query result, in order of preference, matched case-insensitively. */
const COLUMNS = {
  traceId: ['trace_id'],
  spanId: ['span_id'],
  parentSpanId: ['parent_span_id'],
  serviceName: ['service_name'],
  spanName: ['span_name'],
  start: ['start_time', 'timestamp'],
  end: ['end_time'],
  durationMs: ['duration_ms'],
  durationNano: ['duration_nano', 'duration_ns'],
  statusCode: ['status_code', 'span_status_code'],
  statusMessage: ['status_message', 'span_status_message'],
  kind: ['span_kind'],
  scopeName: ['scope_name'],
  scopeVersion: ['scope_version'],
  attributes: ['attributes'],
};
const SPAN_ATTRIBUTE_PREFIX = 'span_attributes.';
const RESOURCE_ATTRIBUTE_PREFIX = 'resource_attributes.';
const SPAN_KINDS = ['UNSPECIFIED', 'INTERNAL', 'SERVER', 'CLIENT', 'PRODUCER', 'CONSUMER'];

/** TrinoSpan is one span read from a result row. Times are epoch nanoseconds. */
export interface TrinoSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  serviceName: string;
  spanName: string;
  startNs: bigint;
  endNs: bigint;
  isError: boolean;
  status: otlptracev1.Status;
  kind: string;
  scopeName: string;
  scopeVersion: string;
  attributes: KeyValue[];
  resourceAttributes: KeyValue[];
}

/** parseSpans reads spans from a Trino result and counts the rows that had no usable trace id, span id or start. */
export function parseSpans(response: TrinoQueryResponse): { spans: TrinoSpan[]; skipped: number } {
  const rows = response.data ?? [];
  const columns = response.columns ?? Object.keys(rows[0] ?? {}).map((name) => ({ name, type: '' }));
  if (columns.length === 0) return { spans: [], skipped: 0 };

  const byName = new Map(columns.map((column) => [column.name.toLowerCase(), column]));
  const find = (names: string[]): TrinoColumn | undefined => names.map((name) => byName.get(name)).find(Boolean);
  const traceId = find(COLUMNS.traceId);
  const spanId = find(COLUMNS.spanId);
  const start = find(COLUMNS.start);
  if (!traceId || !spanId || !start) {
    const missing = [
      !traceId && COLUMNS.traceId[0],
      !spanId && COLUMNS.spanId[0],
      !start && COLUMNS.start.join(' or '),
    ].filter(Boolean);
    throw new Error(`Trino trace query result is missing the required column(s): ${missing.join(', ')}`);
  }
  const optional = Object.fromEntries(Object.entries(COLUMNS).map(([field, names]) => [field, find(names)])) as Record<
    keyof typeof COLUMNS,
    TrinoColumn | undefined
  >;
  const spanAttributeColumns = columns.filter((c) => c.name.toLowerCase().startsWith(SPAN_ATTRIBUTE_PREFIX));
  const resourceAttributeColumns = columns.filter((c) => c.name.toLowerCase().startsWith(RESOURCE_ATTRIBUTE_PREFIX));

  const spans: TrinoSpan[] = [];
  for (const row of rows) {
    const cell = (column: TrinoColumn | undefined): unknown => (column ? row[column.name] : undefined);
    const trace = toId(cell(traceId), traceId);
    const span = toId(cell(spanId), spanId);
    const startNs = parseTrinoTimestampNanos(cell(start));
    if (!trace || !span || startNs === undefined) continue;

    const status = parseStatus(cell(optional.statusCode), toText(cell(optional.statusMessage)));
    const attributes = [
      ...objectToAttributes(cell(optional.attributes)),
      ...prefixedAttributes(row, spanAttributeColumns, SPAN_ATTRIBUTE_PREFIX),
    ];
    spans.push({
      traceId: trace,
      spanId: span,
      parentSpanId: toId(cell(optional.parentSpanId), optional.parentSpanId),
      serviceName: toText(cell(optional.serviceName)) ?? 'unknown',
      spanName: toText(cell(optional.spanName)) ?? '(unknown span)',
      startNs,
      endNs: endNanos(startNs, cell(optional.end), cell(optional.durationMs), cell(optional.durationNano)),
      isError: status.code === otlptracev1.StatusCodeError,
      status,
      kind: parseKind(cell(optional.kind)),
      scopeName: toText(cell(optional.scopeName)) ?? '',
      scopeVersion: toText(cell(optional.scopeVersion)) ?? '',
      attributes,
      resourceAttributes: prefixedAttributes(row, resourceAttributeColumns, RESOURCE_ATTRIBUTE_PREFIX),
    });
  }
  return { spans, skipped: rows.length - spans.length };
}

/** skippedNotice describes rows that parseSpans dropped. */
export function skippedNotice(skipped: number): Notice {
  return {
    type: 'warning',
    message: `${skipped} rows were skipped because they have no trace_id, span_id or parseable start time.`,
  };
}

function endNanos(startNs: bigint, end: unknown, durationMs: unknown, durationNano: unknown): bigint {
  const endNs = parseTrinoTimestampNanos(end);
  if (endNs !== undefined) return endNs;
  const ms = toNumber(durationMs);
  if (ms !== undefined) return startNs + BigInt(Math.round(ms * 1_000_000));
  const nanos = toNumber(durationNano);
  if (nanos !== undefined) return startNs + BigInt(Math.round(nanos));
  return startNs;
}

function toText(value: unknown): string | undefined {
  return value === null || value === undefined || value === '' ? undefined : String(value);
}

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

// Trino returns varbinary as base64, which must become the hex form used for trace and span ids.
function toId(value: unknown, column: TrinoColumn | undefined): string | undefined {
  const text = toText(value);
  if (text === undefined || !column?.type.toLowerCase().startsWith('varbinary')) return text;
  try {
    return Array.from(atob(text), (char) => char.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  } catch {
    return text;
  }
}

function parseStatus(code: unknown, message: string | undefined): otlptracev1.Status {
  const normalized = String(code ?? '')
    .trim()
    .toUpperCase();
  let parsed: otlptracev1.Status['code'];
  if (normalized === 'STATUS_CODE_OK' || normalized === 'OK' || normalized === '1') parsed = otlptracev1.StatusCodeOk;
  else if (normalized === 'STATUS_CODE_ERROR' || normalized === 'ERROR' || normalized === '2') {
    parsed = otlptracev1.StatusCodeError;
  } else if (normalized !== '') parsed = otlptracev1.StatusCodeUnset;
  return { code: parsed, message: message ?? '' };
}

function parseKind(value: unknown): string {
  const text = String(value ?? '')
    .trim()
    .toUpperCase();
  const bare = text.replace(/^SPAN_KIND_/, '');
  const named = /^\d+$/.test(bare) ? SPAN_KINDS[Number(bare)] : bare;
  return named && SPAN_KINDS.includes(named) ? `SPAN_KIND_${named}` : 'SPAN_KIND_UNSPECIFIED';
}

function toAnyValue(value: unknown): AnyValue {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { boolValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { intValue: String(value) } : { doubleValue: value };
  }
  return { stringValue: JSON.stringify(value) };
}

// A map or JSON object becomes one attribute per key; any other value is kept as a single `attributes` attribute.
function objectToAttributes(value: unknown): KeyValue[] {
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value;
    }
  }
  if (parsed === null || parsed === undefined || parsed === '') return [];
  if (typeof parsed === 'object' && !Array.isArray(parsed)) {
    return Object.entries(parsed)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([key, v]) => ({ key, value: toAnyValue(v) }));
  }
  return [{ key: 'attributes', value: { stringValue: typeof value === 'string' ? value : JSON.stringify(value) } }];
}

function prefixedAttributes(row: Record<string, unknown>, columns: TrinoColumn[], prefix: string): KeyValue[] {
  return columns.flatMap((column) => {
    const value = row[column.name];
    if (value === null || value === undefined || value === '') return [];
    return [{ key: column.name.slice(prefix.length), value: toAnyValue(value) }];
  });
}
