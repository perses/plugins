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

/**
 * Output format for SelectMergeStacktraces, serialized as the protobuf enum
 * name. When omitted, the server defaults to the flame graph format.
 */
export type ProfileFormat =
  | 'PROFILE_FORMAT_UNSPECIFIED'
  | 'PROFILE_FORMAT_FLAMEGRAPH'
  | 'PROFILE_FORMAT_TREE'
  | 'PROFILE_FORMAT_DOT'
  | 'PROFILE_FORMAT_PPROF';

/**
 * Aggregation function applied by SelectSeries when down-sampling to the step
 * resolution. Defaults to SUM when omitted.
 */
export type TimeSeriesAggregationType = 'TIME_SERIES_AGGREGATION_TYPE_SUM' | 'TIME_SERIES_AGGREGATION_TYPE_AVERAGE';

/**
 * Request body of POST /querier.v1.QuerierService/SelectMergeStacktraces.
 * Returns matching profiles aggregated into a Flamegraph.
 * https://grafana.com/docs/pyroscope/latest/reference-server-api/#querierv1querierserviceselectmergestacktraces
 */
export interface SelectMergeStacktracesRequest {
  /** Profile type ID: <name>:<type>:<unit>:<period_type>:<period_unit> */
  profileTypeID: string;
  /** Label selector string, e.g. `{service_name="my_service"}` */
  labelSelector: string;
  /** Start of the query window, milliseconds since epoch */
  start: number;
  /** End of the query window, milliseconds since epoch */
  end: number;
  /** Caps the number of nodes in the returned flame graph */
  maxNodes?: number;
  /** Output format; defaults to the flame graph format when omitted */
  format?: ProfileFormat;
}

/**
 * Response of POST /querier.v1.QuerierService/SelectMergeStacktraces.
 */
export interface SelectMergeStacktracesResponse {
  flamegraph: FlameGraph;
}

/**
 * FlameGraph in the packed level representation. Each level's `values` array
 * is a flat list of 4-tuples (offset, total, self, nameIndex)
 * https://github.com/grafana/pyroscope/blob/788a581f23db4af50c2a5ebc81da2d5959ace8f6/api/querier/v1/querier.proto#L157
 */
export interface FlameGraph {
  names: string[];
  levels: Level[];
  // int64 fields are serialized as JSON strings by the Connect/protobuf encoding, so `total`,
  // `maxSelf`, and every `Level.values` entry must be coerced to a number before use.
  total: number | string;
  maxSelf: number | string;
}

export interface Level {
  values: Array<number | string>;
}

/**
 * Request body of POST /querier.v1.QuerierService/SelectSeries.
 * Returns the time series for the total of the matching profiles.
 * https://grafana.com/docs/pyroscope/latest/reference-server-api/#querierv1querierserviceselectseries
 */
export interface SelectSeriesRequest {
  /** Profile type ID: <name>:<type>:<unit>:<period_type>:<period_unit> */
  profileTypeID: string;
  /** Label selector string, e.g. `{service_name="my_service"}` */
  labelSelector: string;
  /** Start of the query window, milliseconds since epoch */
  start: number;
  /** End of the query window, milliseconds since epoch */
  end: number;
  /** Query resolution step width, in seconds */
  step: number;
  /** Aggregation function; defaults to SUM when omitted */
  aggregation?: TimeSeriesAggregationType;
  /** Labels to group the series by */
  groupBy?: string[];
}

/**
 * Response of POST /querier.v1.QuerierService/SelectSeries.
 */
export interface SelectSeriesResponse {
  series: Series[];
}

export interface Series {
  labels: LabelPair[];
  points: Point[];
}

export interface LabelPair {
  name: string;
  value: string;
}

export interface Point {
  /** Sample value (protobuf double, encoded as a JSON number). */
  value: number;
  /** Milliseconds unix timestamp (protobuf int64, serialized as a JSON string). */
  timestamp: number | string;
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
