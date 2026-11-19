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
import { AzureResourceGraphKqlQuery } from './AzureResourceGraphKqlQuery';

const dummyCtx = {} as JsonQueryContext;

function createStubContext(resourceGraphQuery: Mock): JsonQueryContext {
  const getDatasourceClient: Mock = vi.fn(async () => ({
    options: { datasourceUrl: 'http://direct.example' },
    resourceGraphQuery,
  }));
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

function dependsOn(spec: AzureResourceGraphKqlQuerySpec): string[] {
  return AzureResourceGraphKqlQuery.dependsOn!(spec, dummyCtx).variables ?? [];
}

describe('AzureResourceGraphKqlQuery.createInitialOptions', () => {
  it('returns an empty kqlQuery', () => {
    expect(AzureResourceGraphKqlQuery.createInitialOptions()).toEqual({ kqlQuery: '' });
  });
});

describe('AzureResourceGraphKqlQuery.dependsOn', () => {
  it('returns no variables when none are referenced', () => {
    expect(dependsOn({ kqlQuery: 'Resources | project id' })).toEqual([]);
  });

  it('finds a variable referenced in the kqlQuery', () => {
    expect(dependsOn({ kqlQuery: "Resources | where type == '$type'" })).toContain('type');
  });

  it('finds variables referenced in subscriptions', () => {
    expect(
      dependsOn({ kqlQuery: 'Resources', subscriptions: ['$sub1', '00000000-0000-0000-0000-000000000000', '$sub2'] }),
    ).toEqual(['sub1', 'sub2']);
  });

  it('finds variables referenced in managementGroups', () => {
    expect(dependsOn({ kqlQuery: 'Resources', managementGroups: ['$mg'] })).toContain('mg');
  });

  it('de-duplicates repeated variables across fields', () => {
    expect(
      dependsOn({
        kqlQuery: "Resources | where id == '$shared'",
        subscriptions: ['$shared'],
        managementGroups: ['$shared'],
      }),
    ).toEqual(['shared']);
  });
});

describe('AzureResourceGraphKqlQuery.getJsonData', () => {
  it('performs a query against the datasource and returns the results', async () => {
    const resourceGraphQuery: Mock = vi.fn(async () => ({
      data: [
        { id: 'id-1', name: 'vm-1' },
        { id: 'id-2', name: 'vm-2' },
      ],
    }));
    const spec: AzureResourceGraphKqlQuerySpec = {
      kqlQuery: "Resources | where type == 'microsoft.compute/virtualmachines' | project id, name",
    };

    const result = await AzureResourceGraphKqlQuery.getJsonData(spec, createStubContext(resourceGraphQuery));

    expect(resourceGraphQuery).toHaveBeenCalledWith({
      kqlQuery: "Resources | where type == 'microsoft.compute/virtualmachines' | project id, name",
      subscriptions: undefined,
      managementGroups: undefined,
    });
    expect(result).toEqual({
      data: [
        { id: 'id-1', name: 'vm-1' },
        { id: 'id-2', name: 'vm-2' },
      ],
      metadata: { notices: undefined },
    });
  });
});
