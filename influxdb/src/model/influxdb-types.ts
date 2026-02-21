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
import { HTTPProxy, RequestHeaders } from '@perses-dev/core';
import { DatasourceClient } from '@perses-dev/plugin-system';
export type InfluxDBVersion = 'v1' | 'v3';
export interface InfluxDBV1Spec {
  directUrl?: string;
  proxy?: HTTPProxy;
  version: 'v1';
  database: string;
}
export interface InfluxDBV3Spec {
  directUrl?: string;
  proxy?: HTTPProxy;
  version: 'v3';
  organization: string;
  bucket: string;
}
export type InfluxDBDatasourceSpec = InfluxDBV1Spec | InfluxDBV3Spec;
interface InfluxDBClientOptions {
  datasourceUrl: string;
  headers?: RequestHeaders;
}
export interface InfluxDBV1Response {
  results: Array<{
    statement_id?: number;
    series?: Array<{
      name: string;
      columns: string[];
      values: any[][];
      tags?: Record<string, string>;
    }>;
    error?: string;
  }>;
}
export interface InfluxDBV3Response {
  schema: {
    fields: Array<{
      name: string;
      data_type: string;
    }>;
  };
  data: any[][];
}
export interface InfluxDBClient extends DatasourceClient {
  options: InfluxDBClientOptions;
  queryV1(query: string, database: string, headers?: RequestHeaders): Promise<InfluxDBV1Response>;
  queryV3SQL(query: string, organization: string, bucket: string, headers?: RequestHeaders): Promise<InfluxDBV3Response>;
}
