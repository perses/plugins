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

export type VictoriaLogsResultType = 'vector' | 'matrix' | 'streams';

export interface VictoriaLogsQueryStats {
  ingester?: Record<string, unknown>;
  store?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  [key: string]: unknown;
}

export type VictoriaLogsLogEntry = {
  _msg: string;
  _time: string;
  [key: string]: string;
}

export type VictoriaLogsStreamQueryRangeResponse = VictoriaLogsLogEntry[];

export type VictoriaLogsStatsQueryRangeResult = {
  metric: Record<string, string>;
  values: Array<[number, string]>;
}

export type VictoriaLogsStatsQueryRangeData = {
  resultType: string;
  result: VictoriaLogsStatsQueryRangeResult[];
}

export type VictoriaLogsStatsQueryRangeResponse = {
  status: 'success' | 'error';
  error?: string;
  data: VictoriaLogsStatsQueryRangeData;
}

export type VictoriaLogsFieldItem = {
  value: string;
  hits: number;
}

export interface VictoriaLogsFieldNamesResponse {
  values: VictoriaLogsFieldItem[];
}

export interface VictoriaLogsFieldValuesResponse {
  values: VictoriaLogsFieldItem[];
}

export interface VictoriaLogsIndexStatsResponse {
  streams: number;
  chunks: number;
  entries: number;
  bytes: number;
}

export type VictoriaLogsRequestHeaders = Record<string, string>;
