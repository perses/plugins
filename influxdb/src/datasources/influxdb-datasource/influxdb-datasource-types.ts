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

export type InfluxDBVersion = 'v1' | 'v3';

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

export interface InfluxDBV1Series {
  name: string;
  columns: string[];
  values: Array<Array<string | number | null>>;
  tags?: Record<string, string>;
}

export interface InfluxDBV1Response {
  results: Array<{
    series?: InfluxDBV1Series[];
    error?: string;
  }>;
}

export interface InfluxDBV3Response {
  data?: string;
  error?: string;
}

export interface InfluxDBClient {
  options: { datasourceUrl: string; headers?: RequestHeaders };
  queryV1?(query: string, database: string, headers?: RequestHeaders): Promise<InfluxDBV1Response>;
  queryV3SQL?(query: string, headers?: RequestHeaders): Promise<InfluxDBV3Response>;
  queryV3Flux?(query: string, headers?: RequestHeaders): Promise<InfluxDBV3Response>;
}
