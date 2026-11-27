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

import { asSubquery, quoteString, quoteTableName } from '../../model/sql';

const ERROR_STATUS = "StatusCode IN ('Error', 'STATUS_CODE_ERROR')";

/** buildTraceQuery returns the statement reading every span of a trace. */
export function buildTraceQuery(table: string, traceId: string): string {
  // The trace is not filtered by time, so that it can be opened whatever the time range of the dashboard:
  // the lookup relies on the bloom filter index the exporter creates on TraceId.
  return `SELECT * FROM ${quoteTableName(table)} WHERE TraceId = ${quoteString(traceId)} ORDER BY Timestamp`;
}

/**
 * buildMatchQuery returns the statement listing the traces of the spans returned by a search query: the most recent
 * ones first, and one more than the limit, to tell whether more traces match.
 */
export function buildMatchQuery(searchQuery: string, limit: number): string {
  return [
    'SELECT TraceId, min(Timestamp) AS FirstMatch, max(Timestamp) AS LastMatch',
    `FROM ${asSubquery(searchQuery)}`,
    "WHERE TraceId != ''",
    'GROUP BY TraceId',
    'ORDER BY LastMatch DESC',
    `LIMIT ${limit + 1}`,
  ].join('\n');
}

/**
 * buildSummaryQuery returns the statement summarizing traces from all their spans: their root span, time span, and
 * number of spans and errors per service.
 */
export function buildSummaryQuery(table: string, traceIds: string[]): string {
  return [
    'SELECT',
    '  TraceId,',
    '  toString(min(toUnixTimestamp64Nano(toDateTime64(Timestamp, 9)))) AS StartUnixNano,',
    '  toString(max(toUnixTimestamp64Nano(toDateTime64(Timestamp, 9)) + toInt64(Duration))) AS EndUnixNano,',
    "  argMinIf(ServiceName, Timestamp, ParentSpanId = '') AS RootServiceName,",
    "  argMinIf(SpanName, Timestamp, ParentSpanId = '') AS RootSpanName,",
    "  countIf(ParentSpanId = '') AS RootSpans,",
    '  argMin(ServiceName, Timestamp) AS FirstServiceName,',
    '  argMin(SpanName, Timestamp) AS FirstSpanName,',
    '  sumMap(map(toString(ServiceName), toUInt64(1))) AS SpanCounts,',
    `  sumMap(map(toString(ServiceName), toUInt64(${ERROR_STATUS}))) AS ErrorCounts`,
    `FROM ${quoteTableName(table)}`,
    // Not filtered by time, as a trace can start long before and end long after its matched spans: like the lookup
    // of a trace, it relies on the bloom filter index the exporter creates on TraceId.
    `WHERE TraceId IN (${traceIds.map(quoteString).join(', ')})`,
    'GROUP BY TraceId',
    'ORDER BY StartUnixNano DESC',
  ].join('\n');
}
