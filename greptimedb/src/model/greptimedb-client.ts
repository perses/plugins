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

import { RequestHeaders } from '@perses-dev/core';
import { GreptimeDBDatasourceResponse, GreptimeDBQueryRequestParameters } from '../datasources/greptimedb-datasource';

export interface GreptimeDBQueryOptions {
  datasourceUrl: string;
  headers?: RequestHeaders;
}

export interface GreptimeDBQueryResponse {
  status: 'success' | 'error';
  data: unknown;
  error?: string;
}

export interface GreptimeDBClient {
  query: (params: { start: string; end: string; query: string }) => Promise<GreptimeDBQueryResponse>;
}

export async function greptimedbQuery(
  params: GreptimeDBQueryRequestParameters,
  queryOptions: GreptimeDBQueryOptions
): Promise<GreptimeDBDatasourceResponse> {
  const { datasourceUrl, headers } = queryOptions;
  const url = buildSqlUrl(datasourceUrl);

  if (!params.query) {
    throw new Error('No query provided in params');
  }

  const init: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(headers ?? {}),
    },
    body: new URLSearchParams({
      sql: params.query,
    }).toString(),
  };

  try {
    const response = await fetch(url.toString(), init);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('GreptimeDB error response:', errorText);
      return {
        status: 'error',
        data: [],
        error: errorText,
      };
    }

    const body = await response.json();
    const records = body?.output?.[0]?.records;

    return {
      status: body?.status ?? 'success',
      data: records ?? body?.output ?? body,
    };
  } catch (e) {
    throw new Error(`GreptimeDB query failed: ${e}`);
  }
}

function buildSqlUrl(datasourceUrl: string): URL {
  const base = datasourceUrl.endsWith('/') ? `${datasourceUrl}v1/sql` : `${datasourceUrl}/v1/sql`;

  if (base.startsWith('http://') || base.startsWith('https://')) {
    return new URL(base);
  }

  return new URL(base, window.location.origin);
}
