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
import { fetch, RequestHeaders, HTTPProxy } from '@perses-dev/core';
import { DatasourcePlugin } from '@perses-dev/plugin-system';
import { InfluxDBEditor } from './InfluxDBEditor';

export type InfluxDBVersion = 'v1' | 'v3';

/**
 * Validates that a query is read-only (no write operations)
 * Blocks: INSERT, WRITE, DELETE, DROP, ALTER, CREATE, etc.
 * Allows: SELECT, SHOW, etc.
 */
function validateReadOnlyQuery(query: string): void {
  const writePatterns = [
    /^\s*INSERT\s/i,
    /^\s*WRITE\s/i,
    /^\s*DELETE\s/i,
    /^\s*DROP\s/i,
    /^\s*ALTER\s/i,
    /^\s*CREATE\s/i,
    /^\s*TRUNCATE\s/i,
    /^\s*UPDATE\s/i,
  ];

  const trimmedQuery = query.trim();

  for (const pattern of writePatterns) {
    if (pattern.test(trimmedQuery)) {
      const firstWord = trimmedQuery.split(' ')[0]?.toUpperCase() || 'UNKNOWN';
      throw new Error(
        `Write operations are not allowed. Query cannot start with: ${firstWord}. ` +
        'Only read-only queries (SELECT, SHOW, etc.) are permitted.'
      );
    }
  }
}

export interface InfluxDBSpec {
  version: InfluxDBVersion;
  directUrl?: string;
  proxy?: HTTPProxy;
  // V1 specific
  database?: string;
  auth?: string;
  // V3 specific
  organization?: string;
  bucket?: string;
}
export interface InfluxDBV1Response {
  results: Array<{
    series?: Array<{
      name: string;
      columns: string[];
      values: Array<Array<string | number | null>>;
    }>;
    error?: string;
  }>;
}
export interface InfluxDBV3Response {
  data?: Record<string, unknown>;
  error?: string;
}
export interface InfluxDBClient {
  options: { datasourceUrl: string; headers?: RequestHeaders };
  queryV1?(query: string, database: string, headers?: RequestHeaders): Promise<InfluxDBV1Response>;
  queryV3SQL?(query: string, headers?: RequestHeaders): Promise<InfluxDBV3Response>;
  queryV3Flux?(query: string, headers?: RequestHeaders): Promise<InfluxDBV3Response>;
}
const createClient: DatasourcePlugin<InfluxDBSpec, InfluxDBClient>['createClient'] = (spec, options) => {
  const { version, directUrl } = spec;
  const { proxyUrl } = options;
  const datasourceUrl = directUrl ?? proxyUrl;
  if (!datasourceUrl) {
    throw new Error('No URL specified for InfluxDB client');
  }
  // Note: Authentication and TLS are handled by the backend
  // - Proxy: backend resolves spec.auth secret and injects headers/certs via HTTPProxy
  // - Direct: HTTP client applies spec.auth secret for TLS and Basic Auth
  // Backend handles: password (v1), token (v3), TLS certs, CA certs, proxy headers
  const authHeaders: RequestHeaders = {};
  const fetchOptions: RequestInit = { headers: authHeaders };
  const client: InfluxDBClient = {
    options: { datasourceUrl, headers: authHeaders },
  };
  if (version === 'v1') {
    client.queryV1 = async (query: string, database: string, headers?: RequestHeaders): Promise<InfluxDBV1Response> => {
      if (!spec.database && !database) {
        throw new Error('Database is required for InfluxDB v1');
      }
      // V1 Proxy Mode: Only supports read-only /query endpoint (GET)
      // Write operations via /write endpoint are NOT allowed in proxy mode
      const url = new URL('/query', datasourceUrl);
      url.searchParams.set('db', database || spec.database!);
      url.searchParams.set('q', query);
      const response = await fetch(url.toString(), {
        ...fetchOptions,
        method: 'GET',
        headers: { ...authHeaders, ...headers },
      });
      if (!response.ok) throw new Error('InfluxDB v1 query failed: ' + response.statusText);
      return response.json();
    };
  } else if (version === 'v3') {
    client.queryV3SQL = async (query: string, headers?: RequestHeaders): Promise<InfluxDBV3Response> => {
      // Validate: Only read-only queries allowed (no INSERT, WRITE, DELETE, etc.)
      validateReadOnlyQuery(query);

      // V3 SQL Read-Only: /api/v2/query endpoint
      // Only read-only queries are allowed in both direct and proxy access
      const url = new URL('/api/v2/query', datasourceUrl);
      const body = JSON.stringify({
        query,
        dialect: {
          header: true,
          delimiter: ',',
          quoteChar: '"',
          commentPrefix: '#',
          dateTimeFormat: 'RFC3339',
          annotations: ['datatype', 'group', 'default'],
        },
      });
      const response = await fetch(url.toString(), {
        ...fetchOptions,
        method: 'POST',
        headers: { ...authHeaders, ...headers },
        body,
      });
      if (!response.ok) {
        throw new Error(`InfluxDB v3 query failed: ${response.statusText}`);
      }
      return response.json();
    };
    client.queryV3Flux = async (query: string, headers?: RequestHeaders): Promise<InfluxDBV3Response> => {
      if (!spec.organization) {
        throw new Error('Organization is required for InfluxDB v3 Flux');
      }
      // Validate: Only read-only queries allowed (no INSERT, WRITE, DELETE, etc.)
      validateReadOnlyQuery(query);

      // V3 Flux Read-Only: /api/v2/query endpoint
      // Only read-only queries are allowed in both direct and proxy access
      const url = new URL('/api/v2/query', datasourceUrl);
      const body = new URLSearchParams({
        org: spec.organization,
        query,
      });
      const response = await fetch(url.toString(), {
        ...fetchOptions,
        method: 'POST',
        headers: { ...authHeaders, ...headers },
        body,
      });
      if (!response.ok) {
        throw new Error(`InfluxDB v3 flux query failed: ${response.statusText}`);
      }
      return response.json();
    };
  }
  return client;
};
export const InfluxDBDatasource: DatasourcePlugin<InfluxDBSpec, InfluxDBClient> = {
  createClient,
  createInitialOptions: () => ({
    version: 'v1',
    database: '',
  }),
  OptionsEditorComponent: InfluxDBEditor,
};
// Named export with the name expected by module federation
export const InfluxDBDatasourceExport = InfluxDBDatasource;
// Default export for Module Federation
export default InfluxDBDatasource;
