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

import { RequestHeaders } from '@perses-dev/core';

export interface ClickHouseQueryParams {
  query: string;
  database?: string;
}

export interface ClickHouseQueryOptions {
  datasourceUrl: string;
  headers?: RequestHeaders;
}

export interface ClickHouseQueryResponse {
  status: 'success' | 'error';
  data: any;
}

export interface ClickHouseClient {
  query: (params: { start: string; end: string; query: string }) => Promise<ClickHouseQueryResponse>;
}

export async function query(
  params: ClickHouseQueryParams,
  queryOptions: ClickHouseQueryOptions
): Promise<ClickHouseQueryResponse> {
  const { datasourceUrl, headers } = queryOptions;

  const url = urlBuilder(datasourceUrl);
  if (!params.query) {
    throw new Error('No query provided in params');
  }

  let finalQuery = params.query.trim();
  if (!finalQuery.toUpperCase().includes('FORMAT')) {
    finalQuery += ' FORMAT JSON';
  }

  url.searchParams.set('query', finalQuery);
  url.searchParams.set('database', params.database || 'default');

  const init = {
    method: 'GET',
    headers: {
      ...headers,
    },
  };

  try {
    const response = await fetch(url.toString(), init);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ClickHouse error response:', errorText);
      return {
        status: 'error',
        data: [],
      };
    }

    const body = await response.json();

    return {
      status: 'success',
      data: body.data || body,
    };
  } catch (e) {
    throw new Error(`ClickHouse query failed: ${e}`);
  }
}

function urlBuilder(datasourceUrl: string): URL {
  if (datasourceUrl.startsWith('http://') || datasourceUrl.startsWith('https://')) {
    return new URL(datasourceUrl);
  }
  // if relative path (e.g. proxy url), resolve against window.location.origin
  return new URL(datasourceUrl, window.location.origin);
}
