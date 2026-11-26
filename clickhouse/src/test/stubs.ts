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

import type { DatasourceStore } from '@perses-dev/plugin-system';

import type { ClickHouseClient, ClickHouseQueryParams, ClickHouseQueryResponse } from '../model/click-house-client';

/** stubResponse builds the response of a query from its columns, as `[name, type]` pairs, and its rows. */
export function stubResponse(
  columns: Array<[name: string, type: string]>,
  rows: unknown[][] = [],
  extra: Partial<ClickHouseQueryResponse> = {},
): ClickHouseQueryResponse {
  return { columns: columns.map(([name, type]) => ({ name, type })), rows, truncated: false, ...extra };
}

export interface StubClient extends ClickHouseClient {
  /** The statements the client was asked to run, in order. */
  statements: () => string[];
}

/**
 * stubClient returns a client answering each query with what `respond` returns for its statement. A thrown error
 * fails the query.
 */
export function stubClient(respond: (sql: string) => ClickHouseQueryResponse): StubClient {
  const queries: ClickHouseQueryParams[] = [];
  return {
    query: async (params) => {
      queries.push(params);
      return respond(params.query);
    },
    healthCheck: async () => true,
    statements: () => queries.map((params) => params.query),
  };
}

/** stubDatasourceStore returns a datasource store whose datasources all have the given client. */
export function stubDatasourceStore(client: unknown): DatasourceStore {
  return {
    getDatasource: vi.fn(),
    getDatasourceClient: vi.fn(async () => client),
    listDatasourceSelectItems: vi.fn(async () => []),
    getLocalDatasources: vi.fn(),
    setLocalDatasources: vi.fn(),
    getSavedDatasources: vi.fn(),
    setSavedDatasources: vi.fn(),
  } as unknown as DatasourceStore;
}
