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

import type { DatasourceClient } from '@perses-dev/plugin-system';

import type {
  CloudWatchDimensions,
  CloudWatchMetricInfo,
  GetMetricDataParams,
  GetMetricDataResponse,
  ListMetricsParams,
  ListMetricsResponse,
  MetricDataResult,
} from './cloudwatch-client-types';
import {
  CLOUDWATCH_CONTENT_TYPE,
  CLOUDWATCH_MAX_DISCOVERED_METRICS,
  CLOUDWATCH_MAX_PAGES,
  CLOUDWATCH_TARGET_PREFIX,
} from './constants';

export interface CloudWatchClientOptions {
  // datasourceUrl is the URL of the HTTP proxy of the datasource. The Perses server signs the requests with SigV4.
  datasourceUrl: string;
  fetch?: typeof globalThis.fetch;
}

export interface CloudWatchClient extends DatasourceClient {
  options: CloudWatchClientOptions;
  getMetricData: (params: GetMetricDataParams, abortSignal?: AbortSignal) => Promise<GetMetricDataResponse>;
  listMetrics: (params: ListMetricsParams, abortSignal?: AbortSignal) => Promise<ListMetricsResponse>;
}

type JSONObject = Record<string, unknown>;

// AWS JSON errors give their type in this field, for example "com.amazonaws.cloudwatch#InvalidParameterValueException".
const AWS_ERROR_TYPE_FIELD = '__type';

function isRecord(value: unknown): value is JSONObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toDimensionList(dimensions?: CloudWatchDimensions): Array<{ Name: string; Value: string }> | undefined {
  if (dimensions === undefined) {
    return undefined;
  }
  return Object.entries(dimensions).map(([Name, Value]) => ({ Name, Value }));
}

/**
 * Calls an operation of the CloudWatch API (AWS JSON 1.0 protocol) through the HTTP proxy of the datasource.
 */
async function call(
  options: CloudWatchClientOptions,
  operation: string,
  body: JSONObject,
  signal?: AbortSignal,
): Promise<JSONObject> {
  const doFetch = options.fetch ?? globalThis.fetch;
  const response = await doFetch(options.datasourceUrl, {
    method: 'POST',
    headers: { 'Content-Type': CLOUDWATCH_CONTENT_TYPE, 'X-Amz-Target': `${CLOUDWATCH_TARGET_PREFIX}${operation}` },
    body: JSON.stringify(body),
    signal,
  });
  const text = await response.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = undefined;
  }
  if (!response.ok) {
    // AWS errors are {"__type": "...#ErrorCode", "message": "..."}. Errors of the Perses proxy are {"message": "..."}.
    const type =
      isRecord(json) && typeof json[AWS_ERROR_TYPE_FIELD] === 'string'
        ? json[AWS_ERROR_TYPE_FIELD].split('#').pop()
        : undefined;
    const message = isRecord(json) ? (json.message ?? json.Message) : undefined;
    const detail = typeof message === 'string' ? message : text || response.statusText;
    throw new Error(`CloudWatch ${operation} failed (${response.status})${type ? ` ${type}` : ''}: ${detail}`);
  }
  if (!isRecord(json)) {
    throw new Error(`Unexpected CloudWatch ${operation} response`);
  }
  return json;
}

function messagesOf(value: unknown): string {
  if (!Array.isArray(value)) {
    return '';
  }
  return value
    .map((message) => (isRecord(message) ? `${message.Code ?? ''} ${message.Value ?? ''}`.trim() : ''))
    .filter((message) => message !== '')
    .join(', ');
}

export async function getMetricData(
  params: GetMetricDataParams,
  options: CloudWatchClientOptions,
  abortSignal?: AbortSignal,
): Promise<GetMetricDataResponse> {
  const request: JSONObject = {
    StartTime: Math.floor(Date.parse(params.startTime) / 1000),
    EndTime: Math.floor(Date.parse(params.endTime) / 1000),
    ScanBy: 'TimestampAscending',
    MetricDataQueries: params.queries.map((query) => ({
      Id: query.id,
      Label: query.label,
      ReturnData: query.returnData,
      Expression: query.expression,
      MetricStat: query.metric && {
        Metric: {
          Namespace: query.metric.namespace,
          MetricName: query.metric.name,
          Dimensions: toDimensionList(query.metric.dimensions),
        },
        Period: query.metric.period,
        Stat: query.metric.statistic,
      },
    })),
  };
  const results = new Map<string, MetricDataResult>();
  for (let page = 0; page < CLOUDWATCH_MAX_PAGES; page++) {
    // oxlint-disable-next-line no-await-in-loop -- each page needs the NextToken of the previous one
    const response = await call(options, 'GetMetricData', request, abortSignal);
    const messages = messagesOf(response.Messages);
    if (messages) {
      throw new Error(`CloudWatch GetMetricData returned errors: ${messages}`);
    }
    for (const item of Array.isArray(response.MetricDataResults) ? response.MetricDataResults : []) {
      if (!isRecord(item) || typeof item.Id !== 'string') {
        throw new Error('Unexpected CloudWatch GetMetricData response');
      }
      const timestamps = Array.isArray(item.Timestamps) ? item.Timestamps : [];
      const values = Array.isArray(item.Values) ? item.Values : [];
      if (timestamps.length !== values.length) {
        throw new Error('Unexpected CloudWatch GetMetricData response');
      }
      const status = typeof item.StatusCode === 'string' ? item.StatusCode : '';
      if (status === 'Forbidden' || status === 'InternalError') {
        throw new Error(`CloudWatch query "${item.Id}" failed (${status}) ${messagesOf(item.Messages)}`.trim());
      }
      const result = results.get(item.Id) ?? {
        Id: item.Id,
        Label: typeof item.Label === 'string' ? item.Label : '',
        Timestamps: [],
        Values: [],
        StatusCode: status,
      };
      timestamps.forEach((timestamp, index) => {
        result.Timestamps.push(Number(timestamp) * 1000);
        result.Values.push(Number(values[index]));
      });
      result.StatusCode = status;
      results.set(item.Id, result);
    }
    if (typeof response.NextToken !== 'string' || response.NextToken === '') {
      return { MetricDataResults: [...results.values()] };
    }
    request.NextToken = response.NextToken;
  }
  throw new Error('CloudWatch returned too many pages; increase the period or reduce the time range');
}

export async function listMetrics(
  params: ListMetricsParams,
  options: CloudWatchClientOptions,
  abortSignal?: AbortSignal,
): Promise<ListMetricsResponse> {
  const request: JSONObject = {
    Namespace: params.namespace,
    MetricName: params.metricName,
    Dimensions: toDimensionList(params.dimensions),
  };
  const metrics: CloudWatchMetricInfo[] = [];
  for (let page = 0; page < CLOUDWATCH_MAX_PAGES; page++) {
    // oxlint-disable-next-line no-await-in-loop -- each page needs the NextToken of the previous one
    const response = await call(options, 'ListMetrics', request, abortSignal);
    for (const item of Array.isArray(response.Metrics) ? response.Metrics : []) {
      if (metrics.length === CLOUDWATCH_MAX_DISCOVERED_METRICS) {
        return { Metrics: metrics, Truncated: true };
      }
      if (!isRecord(item)) {
        throw new Error('Unexpected CloudWatch ListMetrics response');
      }
      metrics.push({
        Namespace: String(item.Namespace ?? ''),
        MetricName: String(item.MetricName ?? ''),
        Dimensions: (Array.isArray(item.Dimensions) ? item.Dimensions : []).filter(isRecord).map((dimension) => ({
          Name: String(dimension.Name ?? ''),
          Value: String(dimension.Value ?? ''),
        })),
      });
    }
    if (typeof response.NextToken !== 'string' || response.NextToken === '') {
      return { Metrics: metrics, Truncated: false };
    }
    request.NextToken = response.NextToken;
  }
  return { Metrics: metrics, Truncated: true };
}

export function createCloudWatchClient(options: CloudWatchClientOptions): CloudWatchClient {
  return {
    kind: 'CloudWatchDatasource',
    options,
    getMetricData: (params, abortSignal) => getMetricData(params, options, abortSignal),
    listMetrics: (params, abortSignal) => listMetrics(params, options, abortSignal),
  };
}
