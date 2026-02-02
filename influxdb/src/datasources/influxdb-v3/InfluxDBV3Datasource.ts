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
import { InfluxDBV3Spec, InfluxDBClient, InfluxDBV1Response, InfluxDBV3Response } from '../../model';
import { InfluxDBV3Editor } from './InfluxDBV3Editor';

const createClient: DatasourcePlugin<InfluxDBV3Spec, InfluxDBClient>['createClient'] = (spec, options) => {
  const { directUrl } = spec;
  const { proxyUrl } = options;
  const datasourceUrl = directUrl ?? proxyUrl;
  if (!datasourceUrl) {
    throw new Error('No URL specified for InfluxDB v3 client');
  }
  return {
    options: { datasourceUrl },
    queryV1: async (): Promise<InfluxDBV1Response> => {
      throw new Error('InfluxDB v1.8 queries not supported on v3 datasource');
    },
    queryV3SQL: async (query: string, organization: string, bucket: string, headers?: RequestHeaders): Promise<InfluxDBV3Response> => {
      const url = new URL('/api/v3/query_sql', datasourceUrl);
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ query, query_type: 'sql', params: { organization, bucket } }),
      });
      if (!response.ok) throw new Error('InfluxDB v3 query failed: ' + response.statusText);
      return response.json();
    },
  };
};
export const InfluxDBV3Datasource: DatasourcePlugin<InfluxDBV3Spec, InfluxDBClient> = {
  createClient,
  createInitialOptions: () => ({ version: 'v3', organization: '', bucket: '' }),
  OptionsEditorComponent: InfluxDBV3Editor,
};
