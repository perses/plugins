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

export interface GreptimeDBDatasourceSpec {
  directUrl?: string;
  proxy?: HTTPProxy;
}

export interface GreptimeDBQueryRequestParameters {
  query: string;
  start?: string;
  end?: string;
}

interface GreptimeDBDatasourceClientOptions {
  datasourceUrl: string;
  headers?: RequestHeaders;
}

export interface GreptimeDBDatasourceResponse {
  status: 'success' | 'error';
  data: unknown;
  error?: string;
}

export interface GreptimeDBDatasourceClient extends DatasourceClient {
  options: GreptimeDBDatasourceClientOptions;
  query(params: GreptimeDBQueryRequestParameters, headers?: RequestHeaders): Promise<GreptimeDBDatasourceResponse>;
}
