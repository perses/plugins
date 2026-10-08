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

export type CloudWatchDimensions = Record<string, string>;

export interface CloudWatchMetricStat {
  namespace: string;
  name: string;
  dimensions?: CloudWatchDimensions;
  // statistic is Average, Sum, Minimum, Maximum, SampleCount or a percentile like p99.
  statistic: string;
  // period in seconds, a multiple of 60.
  period: number;
}

// CloudWatchMetricDataQuery is either a metric or a metric math expression referencing the IDs of other queries.
export interface CloudWatchMetricDataQuery {
  id: string;
  metric?: CloudWatchMetricStat;
  expression?: string;
  label?: string;
  // returnData is true by default. Set it to false to hide a series only used by an expression.
  returnData?: boolean;
}

export interface GetMetricDataParams {
  startTime: string;
  endTime: string;
  queries: CloudWatchMetricDataQuery[];
}

export interface ListMetricsParams {
  namespace: string;
  metricName?: string;
  dimensions?: CloudWatchDimensions;
}

// MetricDataResult is a result of GetMetricData, with its pages merged.
export interface MetricDataResult {
  Id: string;
  Label: string;
  // Timestamps are in milliseconds, in ascending order.
  Timestamps: number[];
  Values: number[];
  StatusCode: string;
}

export interface GetMetricDataResponse {
  MetricDataResults: MetricDataResult[];
}

export interface CloudWatchDimension {
  Name: string;
  Value: string;
}

export interface CloudWatchMetricInfo {
  Namespace: string;
  MetricName: string;
  Dimensions: CloudWatchDimension[];
}

export interface ListMetricsResponse {
  Metrics: CloudWatchMetricInfo[];
  // Truncated is true when more metrics match the filters than the returned ones.
  Truncated: boolean;
}
