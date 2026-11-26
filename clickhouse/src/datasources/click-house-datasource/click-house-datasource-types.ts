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

import type { DatasourceClient } from '@perses-dev/plugin-system';
import type { HTTPDatasourceSpec } from '@perses-dev/spec';

import type { ClickHouseClient, ClickHouseQueryResponse } from '../../model/click-house-client';

export interface ClickHouseDatasourceSpec extends HTTPDatasourceSpec {
  /** Database the unqualified table names of the queries are read from. Defaults to `default`. */
  database?: string;
}

interface ClickHouseDatasourceClientOptions {
  datasourceUrl: string;
  database: string;
}

export type ClickHouseDatasourceResponse = ClickHouseQueryResponse;

export interface ClickHouseDatasourceClient extends DatasourceClient, ClickHouseClient {
  options: ClickHouseDatasourceClientOptions;
  healthCheck: () => Promise<boolean>;
}
