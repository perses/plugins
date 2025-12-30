// Copyright 2025 The Perses Authors
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

export type LokiResultType = 'vector' | 'matrix' | 'streams';

export interface LokiQueryStats {
  ingester?: Record<string, unknown>;
  store?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface LokiVectorResult {
  metric: Record<string, string>;
  value: [number, string];
}

export interface LokiMatrixResult {
  metric: Record<string, string>;
  values: Array<[number, string]>;
}

export interface LokiStreamResult {
  stream: Record<string, string>;
  values: Array<[string, string]>;
}

export interface LokiQueryResponse {
  status: 'success' | 'error';
  data: {
    resultType: 'vector' | 'streams';
    result: LokiVectorResult[] | LokiStreamResult[];
    stats?: LokiQueryStats;
  };
}

export type LokiQueryRangeResponse = LokiQueryRangeMatrixResponse & LokiQueryRangeStreamsResponse;

export interface LokiQueryRangeMatrixResponse {
  status: 'success' | 'error';
  data: {
    resultType: 'matrix';
    result: LokiMatrixResult[];
    stats?: LokiQueryStats;
  };
}

export interface LokiQueryRangeStreamsResponse {
  status: 'success' | 'error';
  data: {
    resultType: 'streams';
    result: LokiStreamResult[];
    stats?: LokiQueryStats;
  };
}
export interface LokiLabelsResponse {
  status: 'success' | 'error';
  data: string[];
}

export interface LokiLabelValuesResponse {
  status: 'success' | 'error';
  data: string[];
}

export interface LokiSeriesResponse {
  status: 'success' | 'error';
  data: Array<Record<string, string>>;
}

export interface LokiIndexStatsResponse {
  streams: number;
  chunks: number;
  entries: number;
  bytes: number;
}

export type LokiVolumeResponse = Record<string, unknown>;

export type LokiRequestHeaders = Record<string, string>;
