// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import type { JsonQueryContext } from '@perses-dev/plugin-system';
import type { Mock } from 'vitest';

import type { AzureResourceGraphKqlQuerySpec } from './azure-resource-graph-kql-query-types';
import { DEFAULT_DATASOURCE } from './constants';
import { getJsonData } from './get-json-data';

const resourceGraphQuery: Mock = vi.fn();
const getDatasourceClient: Mock = vi.fn(async () => ({
  options: { datasourceUrl: 'http://direct.example' },
  resourceGraphQuery,
}));

function createStubContext(): JsonQueryContext {
  return {
    variableState: {},
    datasourceStore: {
      getDatasource: vi.fn(),
      getDatasourceClient,
      listDatasourceSelectItems: vi.fn(async () => []),
      getLocalDatasources: vi.fn(),
      setLocalDatasources: vi.fn(),
      getSavedDatasources: vi.fn(),
      setSavedDatasources: vi.fn(),
    },
  };
}

const baseSpec: AzureResourceGraphKqlQuerySpec = {
  kqlQuery: 'Resources | project id, name',
};

describe('getJsonData', () => {
  beforeEach(() => {
    resourceGraphQuery.mockReset();
    resourceGraphQuery.mockResolvedValue({ data: [] });
    getDatasourceClient.mockClear();
  });

  it('returns an empty array without querying the datasource when kqlQuery is empty', async () => {
    const result = await getJsonData({ ...baseSpec, kqlQuery: '' }, createStubContext());
    expect(result).toEqual({ data: [] });
    expect(getDatasourceClient).not.toHaveBeenCalled();
  });

  it('uses the default datasource selector when none is specified', async () => {
    await getJsonData(baseSpec, createStubContext());
    expect(getDatasourceClient).toHaveBeenCalledWith(DEFAULT_DATASOURCE);
  });

  it('uses the datasource selector provided in the spec', async () => {
    await getJsonData(
      { ...baseSpec, datasource: { kind: 'AzureResourceManagerDatasource', name: 'prod' } },
      createStubContext(),
    );
    expect(getDatasourceClient).toHaveBeenCalledWith({ kind: 'AzureResourceManagerDatasource', name: 'prod' });
  });

  it('replaces variables in the kqlQuery', async () => {
    const ctx = createStubContext();
    ctx.variableState = { type: { value: 'microsoft.compute/virtualmachines', loading: false } };

    await getJsonData({ ...baseSpec, kqlQuery: "Resources | where type == '$type'" }, ctx);

    const [request] = resourceGraphQuery.mock.calls[0] as [{ kqlQuery: string }];
    expect(request.kqlQuery).toBe("Resources | where type == 'microsoft.compute/virtualmachines'");
  });

  it('flattens and trims comma-separated subscriptions and management groups, replacing variables', async () => {
    const ctx = createStubContext();
    ctx.variableState = {
      sub: {
        value: ['00000000-0000-0000-0000-000000000002', ' 00000000-0000-0000-0000-000000000003 '],
        loading: false,
      },
      mg: { value: ['mg-2', ' mg-3 '], loading: false },
    };

    await getJsonData(
      {
        ...baseSpec,
        subscriptions: [' 00000000-0000-0000-0000-000000000001 ', '${sub:csv}', '00000000-0000-0000-0000-000000000004'],
        managementGroups: [' mg-1 ', ' ${mg:csv} ', 'mg-4'],
      },
      ctx,
    );

    const [request] = resourceGraphQuery.mock.calls[0] as [{ subscriptions: string[]; managementGroups: string[] }];
    expect(request.subscriptions).toEqual([
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000004',
    ]);
    expect(request.managementGroups).toEqual(['mg-1', 'mg-2', 'mg-3', 'mg-4']);
  });

  it('defaults subscriptions and managementGroups to undefined when not specified', async () => {
    await getJsonData(baseSpec, createStubContext());
    const [request] = resourceGraphQuery.mock.calls[0] as [{ subscriptions: string[]; managementGroups: string[] }];
    expect(request.subscriptions).toBeUndefined();
    expect(request.managementGroups).toBeUndefined();
  });

  it('returns the data from the datasource response', async () => {
    resourceGraphQuery.mockResolvedValue({ data: [{ id: 'a' }, { id: 'b' }] });
    const result = await getJsonData(baseSpec, createStubContext());
    expect(result.data).toEqual([{ id: 'a' }, { id: 'b' }]);
  });

  it('surfaces a warning from the datasource response as a notice', async () => {
    resourceGraphQuery.mockResolvedValue({ data: [], warning: 'truncated' });
    const result = await getJsonData(baseSpec, createStubContext());
    expect(result.metadata?.notices).toEqual([{ type: 'warning', message: 'truncated' }]);
  });

  it('does not include notices when there is no warning', async () => {
    resourceGraphQuery.mockResolvedValue({ data: [] });
    const result = await getJsonData(baseSpec, createStubContext());
    expect(result.metadata?.notices).toBeUndefined();
  });
});
