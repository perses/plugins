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

import { fetch, RequestHeaders } from '@perses-dev/core';
import { DatasourceClient } from '@perses-dev/plugin-system';
import {
  AlertManagerStatus,
  AlertsQueryParams,
  GettableAlert,
  GettableSilence,
  PostableSilence,
  SilencesQueryParams,
} from './api-types';

export interface AlertManagerQueryOptions {
  datasourceUrl: string;
  headers?: RequestHeaders;
}

export interface AlertManagerClient extends DatasourceClient {
  options: AlertManagerQueryOptions;
  getAlerts(params?: AlertsQueryParams, headers?: RequestHeaders): Promise<GettableAlert[]>;
  getSilences(params?: SilencesQueryParams, headers?: RequestHeaders): Promise<GettableSilence[]>;
  getSilence(id: string, headers?: RequestHeaders): Promise<GettableSilence>;
  createSilence(silence: PostableSilence, headers?: RequestHeaders): Promise<{ silenceID: string }>;
  deleteSilence(id: string, headers?: RequestHeaders): Promise<void>;
  getStatus(headers?: RequestHeaders): Promise<AlertManagerStatus>;
}

async function throwOnError(response: Response): Promise<void> {
  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = await response.json();
      if (body?.message) message = body.message;
    } catch {
      // no JSON body
    }
    throw new Error(message);
  }
}

const executeRequest = async <T>(...args: Parameters<typeof fetch>): Promise<T> => {
  const response = await fetch(...args);
  await throwOnError(response);
  try {
    return await response.json();
  } catch (e) {
    console.error('Invalid response from server', e);
    throw new Error('Invalid response from server');
  }
};

function buildSearchParams(params: Record<string, unknown> | object): URLSearchParams {
  const urlSearchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => urlSearchParams.append(key, String(entry)));
      return;
    }
    urlSearchParams.append(key, String(value));
  });
  return urlSearchParams;
}

function fetchWithGet<TResponse>(
  apiURI: string,
  params: Record<string, unknown> | object,
  queryOptions: AlertManagerQueryOptions
): Promise<TResponse> {
  const { datasourceUrl, headers = {} } = queryOptions;

  let url = `${datasourceUrl}${apiURI}`;
  const urlParams = buildSearchParams(params).toString();
  if (urlParams !== '') {
    url += `?${urlParams}`;
  }

  return executeRequest<TResponse>(url, {
    method: 'GET',
    headers,
  });
}

export function getAlerts(
  params?: AlertsQueryParams,
  queryOptions?: AlertManagerQueryOptions
): Promise<GettableAlert[]> {
  const opts = queryOptions ?? { datasourceUrl: '' };
  return fetchWithGet<GettableAlert[]>('/api/v2/alerts', params ?? {}, opts);
}

export function getSilences(
  params?: SilencesQueryParams,
  queryOptions?: AlertManagerQueryOptions
): Promise<GettableSilence[]> {
  const opts = queryOptions ?? { datasourceUrl: '' };
  return fetchWithGet<GettableSilence[]>('/api/v2/silences', params ?? {}, opts);
}

export function getSilence(id: string, queryOptions: AlertManagerQueryOptions): Promise<GettableSilence> {
  return fetchWithGet<GettableSilence>(`/api/v2/silence/${encodeURIComponent(id)}`, {}, queryOptions);
}

export function createSilence(
  silence: PostableSilence,
  queryOptions: AlertManagerQueryOptions
): Promise<{ silenceID: string }> {
  const { datasourceUrl, headers = {} } = queryOptions;

  return executeRequest<{ silenceID: string }>(`${datasourceUrl}/api/v2/silences`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(silence),
  });
}

export async function deleteSilence(id: string, queryOptions: AlertManagerQueryOptions): Promise<void> {
  const { datasourceUrl, headers = {} } = queryOptions;

  const response = await fetch(`${datasourceUrl}/api/v2/silence/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers,
  });

  await throwOnError(response);
}

export function getStatus(queryOptions: AlertManagerQueryOptions): Promise<AlertManagerStatus> {
  return fetchWithGet<AlertManagerStatus>('/api/v2/status', {}, queryOptions);
}
