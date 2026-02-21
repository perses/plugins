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
import { InfluxDBV1Spec, InfluxDBClient, InfluxDBV1Response, InfluxDBV3Response } from '../../model';
import { InfluxDBV1Editor } from './InfluxDBV1Editor';
const createClient: DatasourcePlugin<InfluxDBV1Spec, InfluxDBClient>['createClient'] = (spec, options) => {
  const { directUrl } = spec;
  const { proxyUrl } = options;
  const datasourceUrl = directUrl ?? proxyUrl;
  if (!datasourceUrl) {
    throw new Error('No URL specified for InfluxDB v1.8 client');
  }
  return {
    options: { datasourceUrl },
    queryV1: async (query: string, database: string, headers?: RequestHeaders): Promise<InfluxDBV1Response> => {
      const url = new URL('/query', datasourceUrl);
      url.searchParams.set('db', database);
      url.searchParams.set('q', query);
      const response = await fetch(url.toString(), { method: 'GET', headers });
      if (!response.ok) throw new Error('InfluxDB v1.8 query failed: ' + response.statusText);
      return response.json();
    },
    queryV3SQL: async (): Promise<InfluxDBV3Response> => {
      throw new Error('InfluxDB v3 queries not supported on v1.8 datasource');
    },
  };
};
export const InfluxDBV1Datasource: DatasourcePlugin<InfluxDBV1Spec, InfluxDBClient> = {
  createClient,
  createInitialOptions: () => ({ version: 'v1', database: '' }),
  OptionsEditorComponent: InfluxDBV1Editor,
};

// Default export for Module Federation
export default InfluxDBV1Datasource;

