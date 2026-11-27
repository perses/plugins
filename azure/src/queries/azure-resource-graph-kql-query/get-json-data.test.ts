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
import { DATASOURCE_KIND, DEFAULT_DATASOURCE } from './constants';
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

  it('returns an error notice when the KQL query is empty', async () => {
    const ctx = createStubContext();
    const result = await getJsonData({ ...baseSpec, kqlQuery: '' }, ctx);
    expect(result.metadata?.notices).toEqual([{ type: 'error', message: 'KQL query is required' }]);
  });

  it('uses the default datasource selector when none is specified', async () => {
    await getJsonData(baseSpec, createStubContext());
    expect(getDatasourceClient).toHaveBeenCalledWith(DEFAULT_DATASOURCE);
  });

  it('uses the datasource selector provided in the spec', async () => {
    await getJsonData({ ...baseSpec, datasource: { kind: DATASOURCE_KIND, name: 'datasource' } }, createStubContext());
    expect(getDatasourceClient).toHaveBeenCalledWith({ kind: DATASOURCE_KIND, name: 'datasource' });
  });

  it('resolves a datasource variable to a datasource selector', async () => {
    const ctx = createStubContext();
    ctx.variableState = { ds: { value: 'datasource', loading: false } };
    vi.mocked(ctx.datasourceStore.listDatasourceSelectItems).mockResolvedValueOnce([
      {
        group: 'group',
        editLink: '',
        items: [{ name: 'datasource', selector: { kind: DATASOURCE_KIND, name: 'datasource' } }],
      },
    ]);
    await getJsonData({ ...baseSpec, datasource: '$ds' }, ctx);
    expect(getDatasourceClient).toHaveBeenCalledWith({ kind: DATASOURCE_KIND, name: 'datasource' });
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

  it('returns an error notice when the KQL query is empty after variable replacement', async () => {
    const ctx = createStubContext();
    ctx.variableState = {
      emptyVar: { value: '', loading: false },
    };
    const result = await getJsonData({ ...baseSpec, kqlQuery: '${emptyVar}' }, ctx);
    expect(result.metadata?.notices).toEqual([{ type: 'error', message: 'KQL query is required (empty variable?)' }]);
    expect(resourceGraphQuery).not.toHaveBeenCalled();
  });

  it('treats subscriptions containing only blank entries as unspecified', async () => {
    const result = await getJsonData({ ...baseSpec, subscriptions: ['', '   ', ' , '] }, createStubContext());
    expect(result.metadata?.notices).toBeUndefined();
    const [request] = resourceGraphQuery.mock.calls[0] as [{ subscriptions?: string[] }];
    expect(request.subscriptions).toBeUndefined();
  });

  it('drops empty entries but keeps the rest when a variable is empty alongside other values', async () => {
    const ctx = createStubContext();
    ctx.variableState = { emptySub: { value: '', loading: false } };

    await getJsonData({ ...baseSpec, subscriptions: ['${emptySub}', 'sub-1', 'sub-2,,sub-3'] }, ctx);

    const [request] = resourceGraphQuery.mock.calls[0] as [{ subscriptions: string[] }];
    expect(request.subscriptions).toEqual(['sub-1', 'sub-2', 'sub-3']);
  });

  it('forwards the replaced query, subscriptions, and management groups together', async () => {
    const ctx = createStubContext();
    ctx.variableState = { name: { value: 'vm-1', loading: false } };

    await getJsonData(
      { kqlQuery: "Resources | where name == '$name'", subscriptions: ['sub-1'], managementGroups: ['mg-1'] },
      ctx,
    );

    expect(resourceGraphQuery).toHaveBeenCalledWith({
      kqlQuery: "Resources | where name == 'vm-1'",
      subscriptions: ['sub-1'],
      managementGroups: ['mg-1'],
    });
  });

  it('propagates errors thrown by the datasource client', async () => {
    resourceGraphQuery.mockRejectedValue(new Error('error'));
    await expect(getJsonData(baseSpec, createStubContext())).rejects.toThrow('error');
  });
});
