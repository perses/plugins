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
import type { AbsoluteTimeRange, Notice, ServiceStats, TraceData, TraceSearchResult } from '@perses-dev/spec';
import type * as otlpcommonv1 from '@perses-dev/spec/dist/dashboard/query-type/otlp/common/v1/common';
import type * as otlptracev1 from '@perses-dev/spec/dist/dashboard/query-type/otlp/trace/v1/trace';

import type { ClickHouseClient, ClickHouseQueryResponse } from '../../model/click-house-client';
import { formatClickHouseDateTime, replaceTimeRangePlaceholders } from '../../model/click-house-client';
import { DEFAULT_DATASOURCE } from '../constants';
import type {
  ClickHouseTraceQuerySpec,
  ClickHouseTraceSpanRow,
  ClickHouseTraceSummaryRow,
} from './click-house-trace-query-types';
import { DEFAULT_TRACE_SEARCH_LIMIT, DEFAULT_TRACE_TABLE } from './click-house-trace-query-types';

const TRACE_ID_PATTERN = /^[a-fA-F0-9]{16}(?:[a-fA-F0-9]{16})?$/;
const TABLE_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)?$/;
const FORMAT_CLAUSE_PATTERN = /\bFORMAT\s+[A-Za-z0-9_]+\s*$/i;

// The exporter writes the short names (Server, Error). The OTLP enum names (SPAN_KIND_SERVER) are accepted as well.
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

export const getClickHouseTraceData: TraceQueryPlugin<ClickHouseTraceQuerySpec>['getTraceData'] = async (
  spec,
  context,
) => {
  const query = replaceVariables(spec.query ?? '', context.variableState).trim();
  if (query === '') {
    return { searchResult: [] };
  }

  const client = (await context.datasourceStore.getDatasourceClient(
    spec.datasource ?? DEFAULT_DATASOURCE,
  )) as ClickHouseClient;

  /**
   * determine type of query:
   * if the query is 16 or 32 hexadecimal characters it is a trace ID, and the spans of this trace are read from the
   * trace table. SQL cannot match that pattern: it always contains spaces, or letters outside a-f.
   * otherwise, the query is run as SQL, and ClickHouse groups the spans it returns into traces
   */
  if (TRACE_ID_PATTERN.test(query)) {
    return getTraceById(client, query, spec.table || DEFAULT_TRACE_TABLE);
  }
  return searchTraces(client, query, spec.limit ?? DEFAULT_TRACE_SEARCH_LIMIT, context.absoluteTimeRange);
};

async function getTraceById(client: ClickHouseClient, traceId: string, table: string): Promise<TraceData> {
  // The table name is interpolated into SQL, so anything other than a plain identifier is rejected
  if (!TABLE_PATTERN.test(table)) {
    throw new Error(`Invalid trace table "${table}": expected a table name, optionally prefixed with its database.`);
  }

  // The exporter stores trace IDs as 32 lowercase hexadecimal characters
  const normalizedTraceId = traceId.toLowerCase().padStart(32, '0');
  const executedQueryString = buildTraceByIdQuery(normalizedTraceId, table);
  const response = await client.query({ start: '', end: '', query: executedQueryString });
  const rows = getRows<ClickHouseTraceSpanRow>(response);
  if (rows.length === 0) {
    throw new Error(`Trace ${normalizedTraceId} was not found in ${table}.`);
  }

  return {
    trace: clickHouseTraceToOTLP(rows),
    metadata: {
      executedQueryString,
    },
  };
}

async function searchTraces(
  client: ClickHouseClient,
  query: string,
  limit: number,
  timeRange?: AbsoluteTimeRange,
): Promise<TraceData> {
  const start = timeRange ? formatClickHouseDateTime(timeRange.start) : undefined;
  const end = timeRange ? formatClickHouseDateTime(timeRange.end) : undefined;
  // One trace more than asked for is fetched, to know whether more traces match, as the Tempo plugin does
  const executedQueryString = buildSearchQuery(replaceTimeRangePlaceholders(query, start, end), limit + 1);
  // Without a time range the placeholders are left in place, instead of letting the client replace them with ''
  const response = await client.query({ start: start ?? '{start}', end: end ?? '{end}', query: executedQueryString });
  const rows = getRows<ClickHouseTraceSummaryRow>(response);

  const notices: Notice[] = [];
  const hasMoreResults = rows.length > limit;
  if (hasMoreResults) {
    notices.push({
      type: 'info',
      message: 'Not all matching traces are currently displayed. Increase the result limit to view additional traces.',
    });
  }

  return {
    searchResult: rows.slice(0, limit).map(toTraceSearchResult),
    metadata: {
      executedQueryString,
      hasMoreResults,
      notices,
    },
  };
}

/**
 * Wraps a search query so that ClickHouse groups the spans into traces and applies the limit. Without it, every
 * matching span would be transferred and then grouped and discarded in the browser. The query is therefore used as a
 * subquery: it must be a single SELECT, and all the columns it is documented to return are required.
 */
function buildSearchQuery(searchQuery: string, limit: number): string {
  const subQuery = searchQuery.trim().replace(/;+$/, '').trimEnd();
  if (FORMAT_CLAUSE_PATTERN.test(subQuery)) {
    throw new Error('A search query cannot end with a FORMAT clause: its rows are grouped into traces in SQL.');
  }

  const timestampNano = 'toUnixTimestamp64Nano(toDateTime64(Timestamp, 9))';
  // The root span is the one without a parent; when the query doesn't return it, the earliest span stands in for it
  const rootValue = (column: string): string =>
    `if(countIf(ParentSpanId = '') > 0, argMinIf(${column}, Timestamp, ParentSpanId = ''), argMin(${column}, Timestamp))`;

  return `SELECT
  TraceId,
  toString(min(${timestampNano})) AS StartTimeUnixNano,
  toString(max(${timestampNano} + toUInt64(Duration))) AS EndTimeUnixNano,
  ${rootValue('ServiceName')} AS RootServiceName,
  ${rootValue('SpanName')} AS RootSpanName,
  sumMap(map(ServiceName, toUInt64(1))) AS SpanCounts,
  sumMap(map(ServiceName, toUInt64(lower(StatusCode) IN ('error', 'status_code_error')))) AS ErrorCounts
FROM (
${subQuery}
)
WHERE TraceId != ''
GROUP BY TraceId
ORDER BY min(toDateTime64(Timestamp, 9)) DESC
LIMIT ${limit}`;
}

/**
 * Builds the query returning every span of a trace, for a table with the OpenTelemetry Collector ClickHouse exporter
 * schema. Timestamps are converted to nanosecond strings in SQL: DateTime64 values are rendered in the server's
 * timezone, and JSON numbers cannot hold nanoseconds since the epoch.
 *
 * The lookup is deliberately not bounded by time, so that a trace opens from a link whatever the dashboard time
 * range. It relies on the bloom filter index the exporter creates on TraceId. The exporter's `<table>_trace_id_ts`
 * table could bound the scan on large tables, but it only exists when the exporter created the schema. See "Trace ID
 * lookup" in the data model docs.
 */
function buildTraceByIdQuery(traceId: string, table: string): string {
  return `SELECT
  TraceId,
  SpanId,
  ParentSpanId,
  SpanName,
  SpanKind,
  ServiceName,
  ResourceAttributes,
  ScopeName,
  ScopeVersion,
  SpanAttributes,
  toString(toUnixTimestamp64Nano(Timestamp)) AS StartTimeUnixNano,
  toString(Duration) AS DurationNano,
  StatusCode,
  StatusMessage,
  arrayMap(t -> toString(toUnixTimestamp64Nano(t)), Events.Timestamp) AS EventTimesUnixNano,
  Events.Name AS EventNames,
  Events.Attributes AS EventAttributes,
  Links.TraceId AS LinkTraceIds,
  Links.SpanId AS LinkSpanIds,
  Links.Attributes AS LinkAttributes
FROM ${table}
WHERE TraceId = '${traceId}'
ORDER BY Timestamp`;
}

function getRows<T>(response: ClickHouseQueryResponse): T[] {
  // The ClickHouse client logs the error returned by the server to the console, and only returns the status
  if (response.status === 'error') {
    throw new Error('ClickHouse returned an error for the trace query, see the browser console for details.');
  }
  return Array.isArray(response.data) ? (response.data as T[]) : [];
}

function clickHouseTraceToOTLP(rows: ClickHouseTraceSpanRow[]): otlptracev1.TracesData {
  const resourceSpans = new Map<string, otlptracev1.ResourceSpan>();
  const scopeSpans = new Map<string, otlptracev1.ScopeSpan>();

  for (const row of rows) {
    const resourceKey = JSON.stringify([row.ServiceName, row.ResourceAttributes]);
    let resourceSpan = resourceSpans.get(resourceKey);
    if (resourceSpan === undefined) {
      resourceSpan = { resource: { attributes: toResourceAttributes(row) }, scopeSpans: [] };
      resourceSpans.set(resourceKey, resourceSpan);
    }

    const scopeKey = JSON.stringify([resourceKey, row.ScopeName, row.ScopeVersion]);
    let scopeSpan = scopeSpans.get(scopeKey);
    if (scopeSpan === undefined) {
      scopeSpan = { scope: { name: row.ScopeName, version: row.ScopeVersion }, spans: [] };
      scopeSpans.set(scopeKey, scopeSpan);
      resourceSpan.scopeSpans.push(scopeSpan);
    }

    scopeSpan.spans.push(toOTLPSpan(row));
  }

  return { resourceSpans: Array.from(resourceSpans.values()) };
}

function toResourceAttributes(row: ClickHouseTraceSpanRow): otlpcommonv1.KeyValue[] {
  const attributes = toKeyValues(row.ResourceAttributes);
  // The Gantt chart reads the service name from the resource attributes, the exporter also stores it in its own column
  if (row.ServiceName !== '' && !attributes.some((attribute) => attribute.key === 'service.name')) {
    attributes.unshift({ key: 'service.name', value: { stringValue: row.ServiceName } });
  }
  return attributes;
}

// The exporter stores every attribute value as a string, so the original value types cannot be recovered
function toKeyValues(attributes: Record<string, string> = {}): otlpcommonv1.KeyValue[] {
  return Object.entries(attributes).map(([key, value]) => ({ key, value: { stringValue: value } }));
}

function toOTLPSpan(row: ClickHouseTraceSpanRow): otlptracev1.Span {
  return {
    traceId: row.TraceId,
    spanId: row.SpanId,
    parentSpanId: row.ParentSpanId === '' ? undefined : row.ParentSpanId,
    name: row.SpanName,
    kind: SPAN_KIND_MAP[normalizeEnumName(row.SpanKind, 'span_kind_')],
    startTimeUnixNano: row.StartTimeUnixNano,
    // Nanoseconds since the epoch exceed Number.MAX_SAFE_INTEGER
    endTimeUnixNano: (BigInt(row.StartTimeUnixNano) + BigInt(row.DurationNano)).toString(),
    attributes: toKeyValues(row.SpanAttributes),
    events: row.EventNames.map((name, i) => ({
      timeUnixNano: row.EventTimesUnixNano[i] ?? row.StartTimeUnixNano,
      name,
      attributes: toKeyValues(row.EventAttributes[i]),
    })),
    links: row.LinkTraceIds.map((traceId, i) => ({
      traceId,
      spanId: row.LinkSpanIds[i] ?? '',
      attributes: toKeyValues(row.LinkAttributes[i]),
    })),
    status: {
      code: STATUS_CODE_MAP[normalizeEnumName(row.StatusCode, 'status_code_')],
      message: row.StatusMessage === '' ? undefined : row.StatusMessage,
    },
  };
}

function normalizeEnumName(value: string | undefined, prefix: string): string {
  const name = (value ?? '').toLowerCase();
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}

function toTraceSearchResult(row: ClickHouseTraceSummaryRow): TraceSearchResult {
  const startTimeUnixNano = BigInt(row.StartTimeUnixNano);

  const serviceStats: Record<string, ServiceStats> = {};
  for (const [serviceName, spanCount] of Object.entries(row.SpanCounts)) {
    serviceStats[serviceName || 'unknown'] = { spanCount: Number(spanCount) };
  }
  for (const [serviceName, errorCount] of Object.entries(row.ErrorCounts)) {
    const stats = serviceStats[serviceName || 'unknown'];
    // ClickHouse also returns the services without errors, where the panels expect no count at all
    if (stats !== undefined && Number(errorCount) > 0) {
      stats.errorCount = Number(errorCount);
    }
  }

  return {
    traceId: row.TraceId,
    rootServiceName: row.RootServiceName || 'unknown',
    rootTraceName: row.RootSpanName || row.TraceId,
    // Microseconds keep the value a safe integer, nanoseconds since the epoch do not
    startTimeUnixMs: Number(startTimeUnixNano / 1000n) / 1000,
    durationMs: Number(BigInt(row.EndTimeUnixNano) - startTimeUnixNano) / 1e6,
    serviceStats,
  };
}
