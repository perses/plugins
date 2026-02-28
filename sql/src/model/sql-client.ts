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

import { SQLDatasourceSpec } from '../datasources/sql-datasource/sql-datasource-types';

// Types defined locally since they are only used in this file
interface SQLQueryParams {
  query: string;
  headers?: Record<string, string>;
  abortSignal?: AbortSignal;
}

interface SQLQueryResult {
  columns: Array<{
    name: string;
    type: string;
  }>;
  rows: Array<Record<string, unknown>>;
}

interface SQLClientOptions {
  datasourceUrl: string;
  headers?: Record<string, string>;
  spec: SQLDatasourceSpec;
}

/**
 * Execute a SQL query against the datasource
 * Note: This is currently not used - queries are handled by backend proxy
 */
export async function query(params: SQLQueryParams, options: SQLClientOptions): Promise<SQLQueryResult> {
  const { datasourceUrl, headers } = options;

  if (!datasourceUrl) {
    throw new Error('No datasource URL provided');
  }

  const requestBody = {
    query: params.query,
  };

  const response = await fetch(datasourceUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...(params.headers || {}),
    },
    body: JSON.stringify(requestBody),
    signal: params.abortSignal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SQL query failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data as SQLQueryResult;
}
