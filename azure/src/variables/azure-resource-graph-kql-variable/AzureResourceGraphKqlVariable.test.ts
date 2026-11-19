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

import type { GetVariableOptionsContext } from '@perses-dev/plugin-system';
import type { Mock } from 'vitest';

import type { AzureResourceGraphKqlVariableSpec } from './azure-resource-graph-kql-variable-types';
import { AzureResourceGraphKqlVariable } from './AzureResourceGraphKqlVariable';
import { DATASOURCE_KIND } from './constants';

const dummyCtx = {} as GetVariableOptionsContext;

const baseSpec: AzureResourceGraphKqlVariableSpec = {
  kqlQuery: 'Resources | project id, name',
  labelColumnName: 'name',
  valueColumnName: 'id',
};

function dependsOn(spec: AzureResourceGraphKqlVariableSpec): string[] {
  return AzureResourceGraphKqlVariable.dependsOn!(spec, dummyCtx).variables ?? [];
}

describe('AzureResourceGraphKqlVariable.createInitialOptions', () => {
  it('returns the expected default spec', () => {
    expect(AzureResourceGraphKqlVariable.createInitialOptions()).toEqual({
      kqlQuery: '',
      labelColumnName: undefined,
      valueColumnName: 'value',
    });
  });
});

describe('AzureResourceGraphKqlVariable.dependsOn', () => {
  it('returns no variables when none are referenced', () => {
    expect(dependsOn(baseSpec)).toEqual([]);
  });

  it('finds a variable referenced in the kqlQuery', () => {
    expect(dependsOn({ ...baseSpec, kqlQuery: "Resources | where type == '$type'" })).toContain('type');
  });

  it('finds variables referenced in subscriptions and managementGroups', () => {
    expect(dependsOn({ ...baseSpec, subscriptions: ['$sub'], managementGroups: ['$mg'] })).toEqual(['sub', 'mg']);
  });

  it('finds a variable used as the datasource', () => {
    expect(dependsOn({ ...baseSpec, datasource: '$datasourceVar' })).toContain('datasourceVar');
  });

  it('does not treat a static datasource selector as a variable dependency', () => {
    expect(dependsOn({ ...baseSpec, datasource: { kind: DATASOURCE_KIND, name: 'datasourceName' } })).toEqual([]);
  });

  it('de-duplicates repeated variables across fields', () => {
    const spec: AzureResourceGraphKqlVariableSpec = {
      ...baseSpec,
      kqlQuery: "Resources | where id == '$shared'",
      subscriptions: ['$shared'],
    };
    expect(dependsOn(spec)).toEqual(['shared']);
  });
});

describe('AzureResourceGraphKqlVariable.getVariableOptions', () => {
  const resourceGraphQuery: Mock = vi.fn();
  const getDatasourceClient: Mock = vi.fn(async () => ({
    options: { datasourceUrl: 'http://direct.example' },
    resourceGraphQuery,
  }));

  function createStubContext(): GetVariableOptionsContext {
    return {
      variables: {},
      timeRange: { start: new Date('2024-01-01T00:00:00.000Z'), end: new Date('2024-01-01T01:00:00.000Z') },
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

  beforeEach(() => {
    resourceGraphQuery.mockReset();
  });

  it('converts resource graph rows into variable options using the configured columns', async () => {
    resourceGraphQuery.mockResolvedValue({
      data: [
        { name: 'vm-1', id: '/resource/1' },
        { name: 'vm-2', id: '/resource/2' },
      ],
    });

    const result = await AzureResourceGraphKqlVariable.getVariableOptions(baseSpec, createStubContext());

    expect(result.data).toEqual([
      { label: 'vm-1', value: '/resource/1' },
      { label: 'vm-2', value: '/resource/2' },
    ]);
  });

  it('returns an empty list when the response data is not in table format', async () => {
    resourceGraphQuery.mockResolvedValue({ data: 'not-an-array' });

    const result = await AzureResourceGraphKqlVariable.getVariableOptions(baseSpec, createStubContext());

    expect(result.data).toEqual([]);
  });
});
