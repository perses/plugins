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

import type * as otlptracev1 from '@perses-dev/spec/dist/dashboard/query-type/otlp/trace/v1/trace';

/**
 * Envelope used by the client for the list endpoints (services and operations), so callers read `data`.
 */
export interface JaegerApiResponse<T> {
  data: T;
}

/**
 * Response of `GET /api/v3/services`.
 */
export interface JaegerServicesResponse {
  services?: string[];
}

export interface JaegerOperation {
  name: string;
  spanKind?: string;
}

/**
 * Response of `GET /api/v3/operations`.
 */
export interface JaegerOperationsResponse {
  operations?: JaegerOperation[];
}

/**
 * Body of a failed Jaeger API v3 request.
 */
export interface JaegerErrorResponse {
  error?: {
    httpCode?: number;
    message?: string;
  };
}

/**
 * OTLP JSON as returned by Jaeger. Enums are numbers (e.g. `kind: 2`) instead of the names used by Perses.
 */
export interface JaegerOtlpSpan extends Omit<otlptracev1.Span, 'kind' | 'status'> {
  kind?: number | string;
  status?: { code?: number | string; message?: string };
}

export interface JaegerOtlpScopeSpans extends Omit<otlptracev1.ScopeSpan, 'spans'> {
  spans?: JaegerOtlpSpan[];
}

export interface JaegerOtlpResourceSpans extends Omit<otlptracev1.ResourceSpan, 'scopeSpans'> {
  scopeSpans?: JaegerOtlpScopeSpans[];
}

export interface JaegerTracesData {
  resourceSpans?: JaegerOtlpResourceSpans[];
}

/**
 * Response of `GET /api/v3/traces` and `GET /api/v3/traces/{traceId}`.
 */
export interface JaegerTracesResponse {
  result?: JaegerTracesData;
}

export interface JaegerSearchRequestParameters {
  service?: string;
  operation?: string;
  spanKind?: string;
  /** JSON object of attribute filters, e.g. `{"http.status_code":"500"}`. */
  tags?: string;
  /** Go duration, e.g. `100ms` or `1.5s`. */
  minDuration?: string;
  maxDuration?: string;
  limit?: number;
  /** Jaeger API v3 requires both bounds of the start time range. */
  startTime: Date;
  endTime: Date;
}

export const DEFAULT_SEARCH_LIMIT = 20;
