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

import { otlpcommonv1, otlptracev1, TraceSearchResult } from '@perses-dev/core';
import { replaceVariables, TraceQueryPlugin } from '@perses-dev/plugin-system';
import { GreptimeDBClient, GreptimeDBQueryResponse } from '../../model/greptimedb-client';
import { DEFAULT_DATASOURCE } from '../constants';
import {
  GreptimeDBColumnSchema,
  GreptimeDBRecords,
  normalizeRecords,
  toTimestampMs,
} from '../greptimedb-query-data-model';
import { GreptimeDBTraceQuerySpec } from './greptimedb-trace-query-types';

type Row = unknown[];
type ColumnIndexMap = Record<string, number>;

interface MutableTraceResult {
  traceId: string;
  startTimeUnixMs: number;
  endTimeUnixMs: number;
  rootServiceName: string;
  rootTraceName: string;
  serviceStats: Record<string, { spanCount: number; errorCount: number }>;
}

export const getGreptimeDBTraceData: TraceQueryPlugin<GreptimeDBTraceQuerySpec>['getTraceData'] = async (
  spec,
  context
) => {
  const rawQuery = replaceVariables(spec.query ?? '', context.variableState).trim();
  if (rawQuery.length === 0) {
    return { searchResult: [] };
  }

  const datasourceSelector = normalizeDatasourceSelector(spec.datasource);
  const client = (await context.datasourceStore.getDatasourceClient(
    datasourceSelector ?? DEFAULT_DATASOURCE
  )) as GreptimeDBClient;
  const start = context.absoluteTimeRange?.start.getTime().toString() ?? '0';
  const end = context.absoluteTimeRange?.end.getTime().toString() ?? '0';

  const response: GreptimeDBQueryResponse = await client.query({ query: rawQuery, start, end });
  if (response.status === 'error') {
    throw new Error(response.error ?? 'GreptimeDB trace query failed');
  }

  const records = normalizeRecords(response.data);
  const isDetailQuery = isLikelyTraceDetailSQL(rawQuery);

  if (isDetailQuery && isTraceDetailsResult(records)) {
    return {
      trace: convertRowsToTrace(records),
      metadata: {
        executedQueryString: rawQuery,
      },
    };
  }

  return {
    searchResult: buildSearchResult(records),
    metadata: {
      executedQueryString: rawQuery,
    },
  };
};

function normalizeDatasourceSelector(
  datasource: GreptimeDBTraceQuerySpec['datasource']
): GreptimeDBTraceQuerySpec['datasource'] | undefined {
  if (!datasource) {
    return undefined;
  }

  // Deep links may carry an empty datasource name. Treat it as "default datasource for this kind".
  if (typeof datasource.name === 'string' && datasource.name.trim() === '') {
    const { kind } = datasource;
    return kind ? { kind } : undefined;
  }

  return datasource;
}

function buildColumnIndexMap(columns: GreptimeDBColumnSchema[] | undefined): ColumnIndexMap {
  const map: ColumnIndexMap = {};
  (columns ?? []).forEach((c, index) => {
    map[c.name.toLowerCase()] = index;
  });
  return map;
}

function isTraceDetailsResult(records: GreptimeDBRecords | undefined): boolean {
  const columns = records?.schema?.column_schemas ?? [];
  if (columns.length === 0) return false;
  const map = buildColumnIndexMap(columns);
  // Trace detail queries should return span-level columns for gantt visualization.
  return map.trace_id !== undefined && map.span_id !== undefined;
}

function isLikelyTraceDetailSQL(query: string): boolean {
  return /where[\s\S]*trace_id\s*=/i.test(query);
}

function getCell(row: Row, map: ColumnIndexMap, names: string[]): unknown {
  for (const name of names) {
    const idx = map[name.toLowerCase()];
    if (idx !== undefined) {
      return row[idx];
    }
  }
  return undefined;
}

function getString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  return String(value);
}

function getNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isErrorStatus(value: unknown): boolean {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase();
  return normalized === 'STATUS_CODE_ERROR' || normalized === 'ERROR' || normalized === '2';
}

function getDurationMs(row: Row, columns: GreptimeDBColumnSchema[] | undefined, map: ColumnIndexMap): number {
  const durationMs = getNumber(getCell(row, map, ['duration_ms']));
  if (durationMs !== undefined) return durationMs;

  const durationNano = getNumber(getCell(row, map, ['duration_nano', 'duration_ns']));
  if (durationNano !== undefined) return durationNano / 1_000_000;

  const startIndex = map.timestamp ?? map.start_time ?? map.start_time_unix_nano;
  const endIndex = map.timestamp_end ?? map.end_time ?? map.end_time_unix_nano;
  if (startIndex !== undefined && endIndex !== undefined) {
    const startMs = toTimestampMs(row[startIndex], columns?.[startIndex]?.data_type);
    const endMs = toTimestampMs(row[endIndex], columns?.[endIndex]?.data_type);
    if (startMs !== null && endMs !== null) return Math.max(0, endMs - startMs);
  }
  return 0;
}

function getStartMs(row: Row, columns: GreptimeDBColumnSchema[] | undefined, map: ColumnIndexMap): number | undefined {
  const candidates = [
    'timestamp',
    'start_time',
    'start_time_unix_nano',
    'start_time_unix_ns',
    'start_time_unix_ms',
    'start_time_unix',
  ];
  for (const c of candidates) {
    const idx = map[c];
    if (idx === undefined) continue;
    const ts = toTimestampMs(row[idx], columns?.[idx]?.data_type);
    if (ts !== null) return ts;
  }
  return undefined;
}

function getEndMs(row: Row, columns: GreptimeDBColumnSchema[] | undefined, map: ColumnIndexMap): number | undefined {
  const candidates = ['timestamp_end', 'end_time', 'end_time_unix_nano', 'end_time_unix_ns', 'end_time_unix_ms'];
  for (const c of candidates) {
    const idx = map[c];
    if (idx === undefined) continue;
    const ts = toTimestampMs(row[idx], columns?.[idx]?.data_type);
    if (ts !== null) return ts;
  }
  return undefined;
}

function buildSearchResult(records: GreptimeDBRecords | undefined): TraceSearchResult[] {
  const columns = records?.schema?.column_schemas ?? [];
  const rows = records?.rows ?? [];
  if (!columns.length || !rows.length) return [];

  const map = buildColumnIndexMap(columns);
  const traceMap = new Map<string, MutableTraceResult>();

  rows.forEach((row) => {
    const traceId = getString(getCell(row, map, ['trace_id', 'traceid', 'traceId']));
    if (!traceId) return;

    const startMs = getStartMs(row, columns, map);
    const durationMs = getDurationMs(row, columns, map);
    const endMs = getEndMs(row, columns, map) ?? (startMs !== undefined ? startMs + durationMs : undefined);

    const serviceName = getString(getCell(row, map, ['service_name', 'root_service_name'])) ?? 'unknown';
    const spanName =
      getString(getCell(row, map, ['span_name', 'root_trace_name', 'operation_name', 'name'])) ?? '(unknown span)';
    const parentSpanId = getString(getCell(row, map, ['parent_span_id', 'parentspanid', 'parentSpanId']));

    const existing = traceMap.get(traceId);
    if (!existing) {
      traceMap.set(traceId, {
        traceId,
        startTimeUnixMs: startMs ?? 0,
        endTimeUnixMs: endMs ?? startMs ?? 0,
        rootServiceName: serviceName,
        rootTraceName: spanName,
        serviceStats: {
          [serviceName]: {
            spanCount: 1,
            errorCount: isErrorStatus(getCell(row, map, ['span_status_code', 'status_code'])) ? 1 : 0,
          },
        },
      });
      return;
    }

    if (startMs !== undefined) {
      existing.startTimeUnixMs = existing.startTimeUnixMs === 0 ? startMs : Math.min(existing.startTimeUnixMs, startMs);
    }
    if (endMs !== undefined) {
      existing.endTimeUnixMs = Math.max(existing.endTimeUnixMs, endMs);
    }

    if (!parentSpanId) {
      existing.rootTraceName = spanName;
      existing.rootServiceName = serviceName;
    }

    if (!existing.serviceStats[serviceName]) {
      existing.serviceStats[serviceName] = { spanCount: 0, errorCount: 0 };
    }
    existing.serviceStats[serviceName]!.spanCount += 1;
    if (isErrorStatus(getCell(row, map, ['span_status_code', 'status_code']))) {
      existing.serviceStats[serviceName]!.errorCount += 1;
    }
  });

  return Array.from(traceMap.values())
    .map((entry) => ({
      traceId: entry.traceId,
      startTimeUnixMs: entry.startTimeUnixMs,
      durationMs: Math.max(0, entry.endTimeUnixMs - entry.startTimeUnixMs),
      rootServiceName: entry.rootServiceName,
      rootTraceName: entry.rootTraceName,
      serviceStats: entry.serviceStats,
    }))
    .sort((a, b) => b.startTimeUnixMs - a.startTimeUnixMs);
}

function toNanoString(value: unknown, dataType?: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  const raw = getNumber(value);
  if (raw !== undefined) {
    const normalized = (dataType ?? '').toLowerCase();
    if (normalized.includes('nanosecond')) return String(Math.trunc(raw));
    if (normalized.includes('microsecond')) return String(Math.trunc(raw * 1000));
    if (normalized.includes('millisecond')) return String(Math.trunc(raw * 1_000_000));
    if (normalized.includes('second')) return String(Math.trunc(raw * 1_000_000_000));

    if (raw > 1_000_000_000_000_000) return String(Math.trunc(raw));
    if (raw > 1_000_000_000_000) return String(Math.trunc(raw * 1_000_000));
    if (raw > 1_000_000_000) return String(Math.trunc(raw * 1_000_000_000));
    return String(Math.trunc(raw * 1_000_000));
  }

  const dateMs = new Date(String(value)).getTime();
  if (!Number.isNaN(dateMs)) return String(Math.trunc(dateMs * 1_000_000));
  return undefined;
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toAnyValue(value: unknown): otlpcommonv1.AnyValue {
  return {
    stringValue: typeof value === 'string' ? value : JSON.stringify(value),
  };
}

function toKeyValue(key: string, value: unknown): otlpcommonv1.KeyValue {
  return {
    key,
    value: toAnyValue(value),
  };
}

function parseStatusCode(value: unknown): otlptracev1.Status['code'] {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase();
  if (!normalized) return undefined;
  if (normalized === 'STATUS_CODE_OK' || normalized === 'OK' || normalized === '1') {
    return otlptracev1.StatusCodeOk;
  }
  if (normalized === 'STATUS_CODE_ERROR' || normalized === 'ERROR' || normalized === '2') {
    return otlptracev1.StatusCodeError;
  }
  return otlptracev1.StatusCodeUnset;
}

function convertRowsToTrace(records: GreptimeDBRecords | undefined): otlptracev1.TracesData {
  const columns = records?.schema?.column_schemas ?? [];
  const rows = records?.rows ?? [];
  if (!columns.length || !rows.length) return { resourceSpans: [] };

  const map = buildColumnIndexMap(columns);
  const spanColumns = columns.filter((col) => col.name.startsWith('span_attributes.'));
  const resourceColumns = columns.filter((col) => col.name.startsWith('resource_attributes.'));

  const byService = new Map<
    string,
    { resourceAttrs: otlpcommonv1.KeyValue[]; scopeSpans: Map<string, otlptracev1.ScopeSpans> }
  >();

  rows.forEach((row) => {
    const traceId = getString(getCell(row, map, ['trace_id', 'traceid', 'traceId']));
    const spanId = getString(getCell(row, map, ['span_id', 'spanid', 'spanId']));
    if (!traceId || !spanId) return;

    const parentSpanId = getString(getCell(row, map, ['parent_span_id', 'parentspanid', 'parentSpanId']));
    const name = getString(getCell(row, map, ['span_name', 'name', 'operation_name'])) ?? '(unknown span)';
    const kind = (getString(getCell(row, map, ['span_kind', 'kind'])) ??
      'SPAN_KIND_UNSPECIFIED') as otlptracev1.Span['kind'];
    const serviceName = getString(getCell(row, map, ['service_name'])) ?? 'unknown';
    const scopeName = getString(getCell(row, map, ['scope_name'])) ?? '';
    const scopeVersion = getString(getCell(row, map, ['scope_version'])) ?? '';

    const startIndex = map.timestamp ?? map.start_time ?? map.start_time_unix_nano;
    const endIndex = map.timestamp_end ?? map.end_time ?? map.end_time_unix_nano;
    const durationIndex = map.duration_nano ?? map.duration_ns;

    const startTimeUnixNano =
      (startIndex !== undefined ? toNanoString(row[startIndex], columns[startIndex]?.data_type) : undefined) ?? '0';
    const endTimeUnixNano =
      (endIndex !== undefined ? toNanoString(row[endIndex], columns[endIndex]?.data_type) : undefined) ??
      (durationIndex !== undefined
        ? String(parseInt(startTimeUnixNano, 10) + parseInt(toNanoString(row[durationIndex]) ?? '0', 10))
        : startTimeUnixNano);

    const spanAttributes = spanColumns
      .map((c) => {
        const idx = map[c.name.toLowerCase()];
        if (idx === undefined) return undefined;
        const value = row[idx];
        if (value === undefined || value === null || value === '') return undefined;
        return toKeyValue(c.name.replace(/^span_attributes\./, ''), value);
      })
      .filter((v): v is otlpcommonv1.KeyValue => v !== undefined);

    const spanEvents = parseJsonArray(getCell(row, map, ['span_events'])).map((event) => {
      const e = event as Record<string, unknown>;
      const eventTime = toNanoString(e.timeUnixNano ?? e.time_unix_nano ?? e.timestamp ?? e.time) ?? startTimeUnixNano;
      const eventName = getString(e.name) ?? 'event';
      const attrs = e.attributes as Record<string, unknown> | undefined;
      const attributes = attrs
        ? Object.entries(attrs).map(([k, v]) => toKeyValue(k, v))
        : ([] as otlpcommonv1.KeyValue[]);
      return {
        timeUnixNano: eventTime,
        name: eventName,
        attributes,
      };
    });

    const spanLinks = parseJsonArray(getCell(row, map, ['span_links'])).map((link) => {
      const l = link as Record<string, unknown>;
      const attrs = l.attributes as Record<string, unknown> | undefined;
      const attributes = attrs
        ? Object.entries(attrs).map(([k, v]) => toKeyValue(k, v))
        : ([] as otlpcommonv1.KeyValue[]);
      return {
        traceId: getString(l.traceId ?? l.trace_id) ?? '',
        spanId: getString(l.spanId ?? l.span_id) ?? '',
        attributes,
      };
    });

    const statusMessage = getString(getCell(row, map, ['span_status_message'])) ?? '';
    const statusCode = parseStatusCode(getCell(row, map, ['span_status_code', 'status_code']));

    const span: otlptracev1.Span = {
      traceId,
      spanId,
      parentSpanId,
      name,
      kind,
      startTimeUnixNano,
      endTimeUnixNano,
      attributes: spanAttributes,
      events: spanEvents,
      links: spanLinks,
      status: {
        message: statusMessage,
        code: statusCode,
      },
    };

    if (!byService.has(serviceName)) {
      const resourceAttrs: otlpcommonv1.KeyValue[] = [toKeyValue('service.name', serviceName)];
      resourceColumns.forEach((c) => {
        const idx = map[c.name.toLowerCase()];
        if (idx === undefined) return;
        const value = row[idx];
        if (value === undefined || value === null || value === '') return;
        resourceAttrs.push(toKeyValue(c.name.replace(/^resource_attributes\./, ''), value));
      });
      byService.set(serviceName, { resourceAttrs, scopeSpans: new Map<string, otlptracev1.ScopeSpans>() });
    }

    const serviceGroup = byService.get(serviceName)!;
    const scopeKey = `${scopeName}|${scopeVersion}`;
    if (!serviceGroup.scopeSpans.has(scopeKey)) {
      serviceGroup.scopeSpans.set(scopeKey, {
        scope: {
          name: scopeName,
          version: scopeVersion,
        },
        spans: [],
      });
    }
    serviceGroup.scopeSpans.get(scopeKey)!.spans.push(span);
  });

  const resourceSpans: NonNullable<otlptracev1.TracesData['resourceSpans']> = Array.from(byService.entries()).map(
    ([_, value]) => ({
      resource: { attributes: value.resourceAttrs },
      scopeSpans: Array.from(value.scopeSpans.values()),
    })
  );

  return {
    resourceSpans,
  };
}
