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

export interface JaegerApiResponse<T> {
  data: T;
  total?: number;
  limit?: number;
  offset?: number;
  errors?: JaegerApiError[];
}

export interface JaegerApiError {
  code?: number;
  msg: string;
  traceID?: string;
}

export interface JaegerTrace {
  traceID: string;
  spans: JaegerSpan[];
  processes?: Record<string, JaegerProcess>;
  warnings?: string[] | null;
}

export interface JaegerSpan {
  traceID: string;
  spanID: string;
  operationName: string;
  references?: JaegerReference[];
  startTime: number;
  duration: number;
  tags?: JaegerTag[];
  logs?: JaegerLog[];
  processID?: string;
  process?: JaegerProcess;
  warnings?: string[] | null;
}

export interface JaegerReference {
  refType: 'CHILD_OF' | 'FOLLOWS_FROM' | string;
  traceID: string;
  spanID: string;
}

export interface JaegerProcess {
  serviceName: string;
  tags?: JaegerTag[];
}

export type JaegerTag =
  | { key: string; type: 'string'; value: string }
  | { key: string; type: 'bool'; value: boolean }
  | { key: string; type: 'int64'; value: number }
  | { key: string; type: 'float64'; value: number }
  | { key: string; type: 'binary'; value: string };

export interface JaegerLog {
  timestamp: number;
  fields?: JaegerTag[];
}

export interface JaegerOperation {
  name: string;
  spanKind?: string;
}

export interface JaegerSearchRequestParameters {
  traceID?: string[];
  service?: string;
  operation?: string;
  spanKind?: string;
  tags?: string;
  minDuration?: string;
  maxDuration?: string;
  limit?: number;
  start?: number;
  end?: number;
}

export const DEFAULT_SEARCH_LIMIT = 20;
