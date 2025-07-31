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

/**
 * Request parameters of Pyroscope HTTP API endpoint GET /pyroscope/render
 * https://grafana.com/docs/pyroscope/latest/reference-server-api/#querying-profile-data
 */
export interface SearchProfilesParameters {
  query: string;
  /** the start time can be an absolute value (number) or a relative value (string). Ex of relative value : now-15m*/
  from: string | number;
  /** end of the search window, default : now */
  until?: string | number;
  /** format of the returned profiling data, default: json */
  format?: 'json' | 'dot';
  /** maximum number of nodes the resulting flame graph will contain, default: 50 */
  maxNodes?: number;
  groupeBy?: string;
}

/**
 * Response of Pyroscope HTTP API endpoint GET /pyroscope/render
 * https://grafana.com/docs/pyroscope/latest/reference-server-api/#query-output
 */
export interface SearchProfilesResponse {
  flamebearer: Flamebearer;
  metadata: Metadata;
  timeline: Timeline;
}

export interface Flamebearer {
  names: string[];
  levels: number[][];
  numTicks: number;
  maxSelf: number;
}

export interface Metadata {
  format: 'single' | 'double';
  spyName: string;
  sampleRate: number;
  units: string;
  name: string;
}

export interface Timeline {
  startTime: number;
  samples: number[];
  durationDelta: number;
}

/**
 * Request parameters of Pyroscope HTTP API endpoint POST /querier.v1.QuerierService/ProfileTypes
 */
export type SearchProfileTypesParameters = Record<string, never>;

/**
 * Response of Pyroscope HTTP API endpoint POST /querier.v1.QuerierService/ProfileTypes
 */
export interface SearchProfileTypesResponse {
  profileTypes: ProfileType[];
}

export interface ProfileType {
  ID: string;
  name: string;
  sampleType: string;
  sampleUnit: string;
  periodType: string;
  periodUnit: string;
}

/**
 * Request parameters of Pyroscope HTTP API endpoint POST /querier.v1.QuerierService/LabelNames
 */
export type SearchLabelNamesParameters = Record<string, never>;

/**
 * Response of Pyroscope HTTP API endpoint POST /querier.v1.QuerierService/LabelNames
 */
export interface SearchLabelNamesResponse {
  names: string[];
}

/**
 * Request parameters of Pyroscope HTTP API endpoint POST /querier.v1.QuerierService/LabelValues
 */
export type SearchLabelValuesParameters = Record<string, never>;

/**
 * Response of Pyroscope HTTP API endpoint POST /querier.v1.QuerierService/LabelValues
 */
export interface SearchLabelValuesResponse {
  names: string[];
}
