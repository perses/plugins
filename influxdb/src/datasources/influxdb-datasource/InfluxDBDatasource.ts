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
import { DatasourcePlugin } from '@perses-dev/plugin-system';
import { InfluxDBSpec, InfluxDBClient, InfluxDBV1Response, InfluxDBV3Response } from './influxdb-datasource-types';
import { InfluxDBDatasourceEditor } from './InfluxDBDatasourceEditor';

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
      const firstWord = trimmedQuery.split(' ')[0]?.toUpperCase() ?? 'UNKNOWN';
      throw new Error(
        `Write operations are not allowed. Query cannot start with: ${firstWord}. ` +
          'Only read-only queries (SELECT, SHOW, etc.) are permitted.'
      );
    }
  }
}

const createClient: DatasourcePlugin<InfluxDBSpec, InfluxDBClient>['createClient'] = (spec, options) => {
  const { directUrl } = spec;
  const { proxyUrl } = options;
  const datasourceUrl = directUrl ?? proxyUrl;
  if (!datasourceUrl) {
    throw new Error('No URL specified for InfluxDB client');
  }

  const authHeaders: RequestHeaders = {};

  const client: InfluxDBClient = {
    options: { datasourceUrl, headers: authHeaders },
  };

  if (spec.version === 'v1') {
    client.queryV1 = async (query: string, database: string, headers?: RequestHeaders): Promise<InfluxDBV1Response> => {
      const db = database || spec.database;
      if (!db) {
        throw new Error('Database is required for InfluxDB v1');
      }
      const url = new URL('/query', datasourceUrl);
      url.searchParams.set('db', db);
      url.searchParams.set('q', query);
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { ...authHeaders, ...headers },
      });
      if (!response.ok) {
        throw new Error(`InfluxDB v1 query failed: ${response.statusText}`);
      }
      return response.json() as Promise<InfluxDBV1Response>;
    };
  } else if (spec.version === 'v3') {
    client.queryV3SQL = async (query: string, headers?: RequestHeaders): Promise<InfluxDBV3Response> => {
      validateReadOnlyQuery(query);
      const url = new URL('/api/v3/query_sql', datasourceUrl);
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders, ...headers },
        body: JSON.stringify({ q: query, format: 'csv' }),
      });
      if (!response.ok) {
        throw new Error(`InfluxDB v3 SQL query failed: ${response.statusText}`);
      }
      const text = await response.text();
      return { data: text };
    };

    client.queryV3Flux = async (query: string, headers?: RequestHeaders): Promise<InfluxDBV3Response> => {
      if (!spec.organization) {
        throw new Error('Organization is required for InfluxDB v3 Flux');
      }
      validateReadOnlyQuery(query);
      const url = new URL('/api/v2/query', datasourceUrl);
      url.searchParams.set('org', spec.organization);
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders, ...headers },
        body: JSON.stringify({ query, type: 'flux' }),
      });
      if (!response.ok) {
        throw new Error(`InfluxDB v3 Flux query failed: ${response.statusText}`);
      }
      const text = await response.text();
      return { data: text };
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
  OptionsEditorComponent: InfluxDBDatasourceEditor,
};

export default InfluxDBDatasource;
