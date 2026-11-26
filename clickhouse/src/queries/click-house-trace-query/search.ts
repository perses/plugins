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

import type { ServiceStats, TraceSearchResult } from '@perses-dev/spec';

import type { ClickHouseQueryResponse } from '../../model/click-house-client';
import { findColumn, getTypeTimeZone } from '../../model/click-house-types';
import { isRecord, toNumber, toText, toUnixMs } from '../../model/values';

const NANOS_PER_MILLI = 1_000_000;

export interface MatchedTraces {
  traceIds: string[];
  /** Time span of the matched spans of these traces, in milliseconds. */
  firstMatchMs: number;
  lastMatchMs: number;
  /** True when more traces than the limit match. */
  hasMore: boolean;
}

/**
 * readMatchedTraces reads the result of the statement built by `buildMatchQuery`: the matched traces, the most
 * recent ones first, of which the first `limit` ones are kept.
 */
export function readMatchedTraces(response: ClickHouseQueryResponse, limit: number): MatchedTraces {
  const { columns, rows } = response;
  const traceId = findColumn(columns, ['traceid']);
  const first = findColumn(columns, ['firstmatch']);
  const last = findColumn(columns, ['lastmatch']);
  const timeZone = getTypeTimeZone(columns[first]?.type ?? '') ?? response.timeZone;
  const matched: MatchedTraces = {
    traceIds: [],
    firstMatchMs: Infinity,
    lastMatchMs: -Infinity,
    hasMore: rows.length > limit,
  };
  for (const row of rows.slice(0, limit)) {
    const firstMs = toUnixMs(row[first], timeZone);
    const lastMs = toUnixMs(row[last], timeZone);
    if (Number.isNaN(firstMs) || Number.isNaN(lastMs)) {
      throw new Error('The "Timestamp" column of a trace search query must be a date/time.');
    }
    matched.traceIds.push(toText(row[traceId]));
    matched.firstMatchMs = Math.min(matched.firstMatchMs, firstMs);
    matched.lastMatchMs = Math.max(matched.lastMatchMs, lastMs);
  }
  return matched;
}

function toUnixNanoBigInt(value: unknown): bigint {
  try {
    return BigInt(toText(value) || '0');
  } catch {
    return 0n;
  }
}

/** buildSearchResult reads the result of the statement built by `buildSummaryQuery`. */
export function buildSearchResult(response: ClickHouseQueryResponse): TraceSearchResult[] {
  const { columns, rows } = response;
  const index = (name: string): number => findColumn(columns, [name]);
  const traceId = index('traceid');
  const start = index('startunixnano');
  const end = index('endunixnano');
  const rootSpans = index('rootspans');
  const rootServiceName = index('rootservicename');
  const rootSpanName = index('rootspanname');
  const firstServiceName = index('firstservicename');
  const firstSpanName = index('firstspanname');
  const spanCounts = index('spancounts');
  const errorCounts = index('errorcounts');

  return rows.map((row) => {
    const startNano = toUnixNanoBigInt(row[start]);
    const endNano = toUnixNanoBigInt(row[end]);
    // A trace whose root span is missing, e.g. not received yet, is named after its first span.
    const hasRoot = (toNumber(row[rootSpans]) ?? 0) > 0;
    const spans: unknown = row[spanCounts];
    const errors: unknown = row[errorCounts];
    const serviceStats: Record<string, ServiceStats> = {};
    if (isRecord(spans)) {
      for (const service of Object.keys(spans)) {
        const errorCount = isRecord(errors) ? (toNumber(errors[service]) ?? 0) : 0;
        serviceStats[service] = {
          spanCount: toNumber(spans[service]) ?? 0,
          ...(errorCount > 0 && { errorCount }),
        };
      }
    }
    return {
      traceId: toText(row[traceId]),
      rootServiceName: toText(row[hasRoot ? rootServiceName : firstServiceName]),
      rootTraceName: toText(row[hasRoot ? rootSpanName : firstSpanName]),
      startTimeUnixMs: Number(startNano / BigInt(NANOS_PER_MILLI)),
      durationMs: Number(endNano - startNano) / NANOS_PER_MILLI,
      serviceStats,
    };
  });
}
