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

import type { RequestHeaders } from '@perses-dev/client';
import type { DatasourceClient } from '@perses-dev/plugin-system';
import type { HTTPProxy } from '@perses-dev/spec';

export interface JsonDatasourceSpec {
  directUrl?: string;
  proxy?: HTTPProxy;
}

export interface QueryRequestParameters {
  endpointUrl: string;
  method: string;
  queryParams?: Record<string, string>;
  body?: string;
}

interface JsonDatasourceClientOptions {
  datasourceUrl: string;
  headers?: RequestHeaders;
}

export type JsonDatasourceResponse = unknown;
export interface JsonDatasourceClient extends DatasourceClient {
  options: JsonDatasourceClientOptions;
  query(params: QueryRequestParameters, headers?: RequestHeaders): Promise<JsonDatasourceResponse>;
}
