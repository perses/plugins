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

import type { DatasourceSelector } from '@perses-dev/spec';

export const DEFAULT_TRACE_TABLE = 'otel_traces';
export const DEFAULT_TRACE_SEARCH_LIMIT = 20;

export interface ClickHouseTraceQuerySpec {
  /**
   * A trace ID to show a single trace, or a SQL query returning one row per span to search traces.
   */
  query: string;
  /**
   * Table (or `database.table`) using the OpenTelemetry Collector ClickHouse exporter schema, read by trace ID lookups.
   */
  table?: string;
  /**
   * Maximum number of traces returned by a search.
   */
  limit?: number;
  datasource?: DatasourceSelector;
}

/**
 * A trace of a search, as grouped by ClickHouse. See `buildSearchQuery`.
 */
export interface ClickHouseTraceSummaryRow {
  TraceId: string;
  StartTimeUnixNano: string;
  EndTimeUnixNano: string;
  RootServiceName: string;
  RootSpanName: string;
  SpanCounts: Record<string, number | string>;
  ErrorCounts: Record<string, number | string>;
}

/**
 * A span returned by the trace ID lookup, see `buildTraceByIdQuery`.
 */
export interface ClickHouseTraceSpanRow {
  TraceId: string;
  SpanId: string;
  ParentSpanId: string;
  SpanName: string;
  SpanKind: string;
  ServiceName: string;
  ResourceAttributes: Record<string, unknown>;
  ScopeName: string;
  ScopeVersion: string;
  SpanAttributes: Record<string, unknown>;
  StartTimeUnixNano: string;
  DurationNano: string;
  StatusCode: string;
  StatusMessage: string;
  EventTimesUnixNano: string[];
  EventNames: string[];
  EventAttributes: Array<Record<string, unknown>>;
  LinkTraceIds: string[];
  LinkSpanIds: string[];
  LinkAttributes: Array<Record<string, unknown>>;
}
