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

import {
  LokiQueryResponse,
  LokiQueryRangeResponse,
  LokiLabelsResponse,
  LokiLabelValuesResponse,
  LokiSeriesResponse,
  LokiIndexStatsResponse,
  LokiVolumeResponse,
  LokiRequestHeaders,
} from './loki-client-types';

export interface LokiQueryParams {
  query: string;
  time?: string;
  direction?: 'forward' | 'backward';
  limit?: number;
}

export interface LokiQueryRangeParams {
  query: string;
  start: string;
  end: string;
  step?: string;
  interval?: string;
  direction?: 'forward' | 'backward';
  limit?: number;
}

export interface LokiVolumeParams {
  query: string;
  start: string;
  end: string;
  step?: string;
  limit?: number;
}

export interface LokiApiOptions {
  datasourceUrl: string;
  headers?: LokiRequestHeaders;
}

export interface LokiClient {
  options: {
    datasourceUrl: string;
  };
  query: (params: LokiQueryParams, headers?: LokiRequestHeaders) => Promise<LokiQueryResponse>;
  queryRange: (params: LokiQueryRangeParams, headers?: LokiRequestHeaders) => Promise<LokiQueryRangeResponse>;
  labels: (start?: string, end?: string, headers?: LokiRequestHeaders) => Promise<LokiLabelsResponse>;
  labelValues: (
    label: string,
    start?: string,
    end?: string,
    headers?: LokiRequestHeaders
  ) => Promise<LokiLabelValuesResponse>;
  series: (match: string[], start?: string, end?: string, headers?: LokiRequestHeaders) => Promise<LokiSeriesResponse>;
  volume: (params: LokiVolumeParams, headers?: LokiRequestHeaders) => Promise<LokiVolumeResponse>;
  volumeRange: (params: LokiVolumeParams, headers?: LokiRequestHeaders) => Promise<LokiVolumeResponse>;
  indexStats: (
    query: string,
    start?: string,
    end?: string,
    headers?: LokiRequestHeaders
  ) => Promise<LokiIndexStatsResponse>;
}

export async function query(params: LokiQueryParams, options: LokiApiOptions): Promise<LokiQueryResponse> {
  const url = buildUrl('/loki/api/v1/query', options.datasourceUrl);
  url.searchParams.append('query', params.query);
  if (params.time) url.searchParams.append('time', params.time);
  if (params.direction) url.searchParams.append('direction', params.direction);
  if (params.limit) url.searchParams.append('limit', params.limit.toString());

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response.json();
}

function buildUrl(path: string, datasourceUrl: string): URL {
  if (datasourceUrl.startsWith('http://') || datasourceUrl.startsWith('https://')) {
    return new URL(path, datasourceUrl);
  }

  let fullPath = datasourceUrl;
  // Assume relative path, ensure no double slashes
  if (datasourceUrl.endsWith('/') && path.startsWith('/')) {
    fullPath = datasourceUrl + path.slice(1);
  } else if (!datasourceUrl.endsWith('/') && !path.startsWith('/')) {
    fullPath = datasourceUrl + '/' + path;
  } else {
    fullPath = datasourceUrl + path;
  }

  return new URL(fullPath, window.location.origin);
}

export function toUnixSeconds(val: string | number | Date): string {
  if (val instanceof Date) return Math.floor(val.getTime() / 1000).toString();
  if (typeof val === 'number') {
    // If it's in ms (>= 10^12), convert to s
    return Math.floor(val > 1e11 ? val / 1000 : val).toString();
  }
  if (/^\d+$/.test(val)) {
    const num = Number(val);
    return Math.floor(num > 1e11 ? num / 1000 : num).toString();
  }
  const d = new Date(val);
  return Math.floor(d.getTime() / 1000).toString();
}

export async function queryRange(
  params: LokiQueryRangeParams,
  options: LokiApiOptions
): Promise<LokiQueryRangeResponse> {
  const url = buildUrl('/loki/api/v1/query_range', options.datasourceUrl);
  url.searchParams.append('query', params.query);
  url.searchParams.append('start', toUnixSeconds(params.start));
  url.searchParams.append('end', toUnixSeconds(params.end));
  if (params.step) url.searchParams.append('step', params.step);
  if (params.interval) url.searchParams.append('interval', params.interval);
  if (params.direction) url.searchParams.append('direction', params.direction);
  if (params.limit) url.searchParams.append('limit', params.limit.toString());

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response.json();
}

export async function labels(
  start: string | undefined,
  end: string | undefined,
  options: LokiApiOptions
): Promise<LokiLabelsResponse> {
  const url = buildUrl('/loki/api/v1/labels', options.datasourceUrl);
  if (start) url.searchParams.append('start', start);
  if (end) url.searchParams.append('end', end);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response.json();
}

export async function labelValues(
  label: string,
  start: string | undefined,
  end: string | undefined,
  options: LokiApiOptions
): Promise<LokiLabelValuesResponse> {
  const url = buildUrl(`/loki/api/v1/label/${label}/values`, options.datasourceUrl);
  if (start) url.searchParams.append('start', start);
  if (end) url.searchParams.append('end', end);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response.json();
}

export async function series(
  match: string[],
  start: string | undefined,
  end: string | undefined,
  options: LokiApiOptions
): Promise<LokiSeriesResponse> {
  const url = buildUrl('/loki/api/v1/series', options.datasourceUrl);
  match.forEach((m) => url.searchParams.append('match[]', m));
  if (start) url.searchParams.append('start', start);
  if (end) url.searchParams.append('end', end);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response.json();
}

export async function volume(params: LokiVolumeParams, options: LokiApiOptions): Promise<LokiVolumeResponse> {
  const url = buildUrl('/loki/api/v1/index/volume', options.datasourceUrl);
  url.searchParams.append('query', params.query);
  url.searchParams.append('start', params.start);
  url.searchParams.append('end', params.end);
  if (params.step) url.searchParams.append('step', params.step);
  if (params.limit) url.searchParams.append('limit', params.limit.toString());

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response.json();
}

export async function volumeRange(params: LokiVolumeParams, options: LokiApiOptions): Promise<LokiVolumeResponse> {
  const url = buildUrl('/loki/api/v1/index/volume_range', options.datasourceUrl);
  url.searchParams.append('query', params.query);
  url.searchParams.append('start', params.start);
  url.searchParams.append('end', params.end);
  if (params.step) url.searchParams.append('step', params.step);
  if (params.limit) url.searchParams.append('limit', params.limit.toString());

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response.json();
}

export async function indexStats(
  query: string,
  start: string | undefined,
  end: string | undefined,
  options: LokiApiOptions
): Promise<LokiIndexStatsResponse> {
  const url = buildUrl('/loki/api/v1/index/stats', options.datasourceUrl);
  url.searchParams.append('query', query);
  if (start) url.searchParams.append('start', start);
  if (end) url.searchParams.append('end', end);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return response.json();
}
