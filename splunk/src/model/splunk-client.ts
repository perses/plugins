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
  SplunkJobCreateResponse,
  SplunkJobStatusResponse,
  SplunkResultsResponse,
  SplunkEventsResponse,
  SplunkIndexResponse,
  SplunkRequestHeaders,
} from './splunk-client-types';
import { fetch } from '@perses-dev/core';

export interface SplunkJobCreateParams {
  search: string;
  earliest_time?: string;
  latest_time?: string;
  output_mode?: string;
}

export interface SplunkJobResultsParams {
  output_mode?: string;
  count?: number;
  offset?: number;
}

export interface SplunkExportSearchParams {
  search: string;
  earliest_time?: string;
  latest_time?: string;
  output_mode?: string;
}

export interface SplunkApiOptions {
  datasourceUrl: string;
  headers?: SplunkRequestHeaders;
}

export interface SplunkClient {
  options: {
    datasourceUrl: string;
  };
  createJob: (params: SplunkJobCreateParams, headers?: SplunkRequestHeaders) => Promise<SplunkJobCreateResponse>;
  getJobStatus: (jobId: string, headers?: SplunkRequestHeaders) => Promise<SplunkJobStatusResponse>;
  getJobResults: (
    jobId: string,
    params?: SplunkJobResultsParams,
    headers?: SplunkRequestHeaders
  ) => Promise<SplunkResultsResponse>;
  getJobEvents: (
    jobId: string,
    params?: SplunkJobResultsParams,
    headers?: SplunkRequestHeaders
  ) => Promise<SplunkEventsResponse>;
  exportSearch: (params: SplunkExportSearchParams, headers?: SplunkRequestHeaders) => Promise<SplunkResultsResponse>;
  getIndexes: (headers?: SplunkRequestHeaders) => Promise<SplunkIndexResponse>;
}

function buildUrl(path: string, datasourceUrl: string): URL {
  if (datasourceUrl.startsWith('http://') || datasourceUrl.startsWith('https://')) {
    return new URL(path, datasourceUrl);
  }

  let fullPath = datasourceUrl;
  if (datasourceUrl.endsWith('/') && path.startsWith('/')) {
    fullPath = datasourceUrl + path.slice(1);
  } else if (!datasourceUrl.endsWith('/') && !path.startsWith('/')) {
    fullPath = datasourceUrl + '/' + path;
  } else {
    fullPath = datasourceUrl + path;
  }

  return new URL(fullPath, window.location.origin);
}

export async function createJob(
  params: SplunkJobCreateParams,
  options: SplunkApiOptions
): Promise<SplunkJobCreateResponse> {
  const url = buildUrl('/services/search/v2/jobs', options.datasourceUrl);

  const formData = new URLSearchParams();
  formData.append('search', params.search);
  if (params.earliest_time) formData.append('earliest_time', params.earliest_time);
  if (params.latest_time) formData.append('latest_time', params.latest_time);
  formData.append('output_mode', params.output_mode || 'json');
  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...options.headers,
      },
      credentials: 'include',
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Splunk API error: ${response.status} ${response.statusText} ${errorText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error creating job:', error);
    throw error;
  }
}

export async function getJobStatus(jobId: string, options: SplunkApiOptions): Promise<SplunkJobStatusResponse> {
  const url = buildUrl(`/services/search/v2/jobs/${jobId}`, options.datasourceUrl);
  url.searchParams.append('output_mode', 'json');
  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Splunk API error: ${response.status} ${response.statusText} ${errorText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching job status:', error);
    throw error;
  }
}

export async function getJobResults(
  jobId: string,
  params: SplunkJobResultsParams = {},
  options: SplunkApiOptions
): Promise<SplunkResultsResponse> {
  const url = buildUrl(`/services/search/v2/jobs/${jobId}/results`, options.datasourceUrl);
  url.searchParams.append('output_mode', params.output_mode || 'json');
  if (params.count) url.searchParams.append('count', params.count.toString());
  if (params.offset) url.searchParams.append('offset', params.offset.toString());
  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Splunk API error: ${response.status} ${response.statusText} ${errorText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching job results:', error);
    throw error;
  }
}

export async function getJobEvents(
  jobId: string,
  params: SplunkJobResultsParams = {},
  options: SplunkApiOptions
): Promise<SplunkEventsResponse> {
  const url = buildUrl(`/services/search/v2/jobs/${jobId}/events`, options.datasourceUrl);
  url.searchParams.append('output_mode', params.output_mode || 'json');
  if (params.count) url.searchParams.append('count', params.count.toString());
  if (params.offset) url.searchParams.append('offset', params.offset.toString());
  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Splunk API error: ${response.status} ${response.statusText} ${errorText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching job events:', error);
    throw error;
  }
}

/* TODO: Splunk export is a streaming endpoint and should be handled differently using a streaming parser.
The current implementation which waits for the entire response before processing.
This is a temporary implementation to unblock plugin development.
Refactor later to properly handle streaming responses. */
export async function exportSearch(
  params: SplunkExportSearchParams,
  options: SplunkApiOptions
): Promise<SplunkResultsResponse> {
  const url = buildUrl('/services/search/v2/jobs/export', options.datasourceUrl);

  const formData = new URLSearchParams();
  formData.append('search', params.search);
  if (params.earliest_time) formData.append('earliest_time', params.earliest_time);
  if (params.latest_time) formData.append('latest_time', params.latest_time);
  formData.append('output_mode', params.output_mode || 'json');
  let response: any;
  try {
    response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...options.headers,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Splunk Export API error: ${response.status} ${response.statusText} ${errorText}`);
    }
  } catch (error) {
    throw error;
  }

  const text = await response.text();
  const lines = text.trim().split('\n');
  const results = lines.filter((line: any) => line.trim()).map((line: any) => JSON.parse(line).result);

  return {
    results: results,
    preview: false,
    init_offset: 0,
  } as SplunkResultsResponse;
}

export async function getIndexes(options: SplunkApiOptions): Promise<SplunkIndexResponse> {
  const url = buildUrl('/services/data/indexes', options.datasourceUrl);
  url.searchParams.append('output_mode', 'json');
  url.searchParams.append('count', '0');
  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Splunk API error: ${response.status} ${response.statusText} ${errorText}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching job events:', error);
    throw error;
  }

}
