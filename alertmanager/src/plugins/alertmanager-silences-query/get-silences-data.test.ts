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

import { SilencesQueryContext } from '@perses-dev/plugin-system';
import { AlertManagerClient } from '../../model';
import { AlertManagerDatasource } from '../alertmanager-datasource';
import { AlertManagerSilencesQuerySpec } from '../types';
import { getSilencesData } from './get-silences-data';

const datasource = { directUrl: 'http://am.example' };

const mockSilences = [
  {
    id: 'silence-1',
    status: { state: 'active' as const },
    updatedAt: '2024-01-01T00:00:00Z',
    comment: 'Maintenance window',
    createdBy: 'admin',
    endsAt: '2024-01-01T04:00:00Z',
    matchers: [{ name: 'alertname', value: 'HighMemory', isRegex: false, isEqual: true }],
    startsAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'silence-2',
    status: { state: 'expired' as const },
    updatedAt: '2024-01-02T00:00:00Z',
    comment: 'Testing',
    createdBy: 'dev',
    endsAt: '2024-01-02T01:00:00Z',
    matchers: [
      { name: 'severity', value: 'warning', isRegex: false, isEqual: true },
      { name: 'instance', value: 'server-.*', isRegex: true, isEqual: true },
    ],
    startsAt: '2024-01-02T00:00:00Z',
  },
];

const makeClient = (): AlertManagerClient => {
  const client = AlertManagerDatasource.createClient(datasource, {});
  client.getSilences = jest.fn(async () => mockSilences);
  return client;
};

function createContext(client: AlertManagerClient): SilencesQueryContext {
  return {
    variableState: {},
    datasourceStore: {
      getDatasource: jest.fn(),
      getDatasourceClient: jest.fn(() =>
        Promise.resolve(client)
      ) as SilencesQueryContext['datasourceStore']['getDatasourceClient'],
      listDatasourceSelectItems: jest.fn(async () => []),
      getLocalDatasources: jest.fn(),
      setLocalDatasources: jest.fn(),
      getSavedDatasources: jest.fn(),
      setSavedDatasources: jest.fn(),
    },
  };
}

describe('getSilencesData', () => {
  it('transforms API silences into SilencesData format', async () => {
    const client = makeClient();
    const spec: AlertManagerSilencesQuerySpec = {};
    const context = createContext(client);

    const result = await getSilencesData(spec, context as unknown as Parameters<typeof getSilencesData>[1]);

    expect(result.silences).toHaveLength(2);
    expect(result.silences[0]).toEqual({
      id: 'silence-1',
      state: 'active',
      matchers: [{ name: 'alertname', value: 'HighMemory', isRegex: false, isEqual: true }],
      startsAt: '2024-01-01T00:00:00Z',
      endsAt: '2024-01-01T04:00:00Z',
      createdBy: 'admin',
      comment: 'Maintenance window',
      updatedAt: '2024-01-01T00:00:00Z',
    });
  });

  it('maps expired silence status correctly', async () => {
    const client = makeClient();
    const spec: AlertManagerSilencesQuerySpec = {};
    const context = createContext(client);

    const result = await getSilencesData(spec, context as unknown as Parameters<typeof getSilencesData>[1]);

    expect(result.silences[1]?.state).toBe('expired');
    expect(result.silences[1]?.matchers).toHaveLength(2);
    expect(result.silences[1]?.matchers[1]?.isRegex).toBe(true);
  });

  it('passes filter parameters to the client', async () => {
    const client = makeClient();
    const spec: AlertManagerSilencesQuerySpec = {
      filters: ['alertname="HighMemory"'],
    };
    const context = createContext(client);

    await getSilencesData(spec, context as unknown as Parameters<typeof getSilencesData>[1]);

    expect(client.getSilences).toHaveBeenCalledWith({
      filter: ['alertname="HighMemory"'],
    });
  });

  it('returns empty silences array when API returns empty', async () => {
    const client = makeClient();
    client.getSilences = jest.fn(async () => []);
    const spec: AlertManagerSilencesQuerySpec = {};
    const context = createContext(client);

    const result = await getSilencesData(spec, context as unknown as Parameters<typeof getSilencesData>[1]);

    expect(result.silences).toEqual([]);
  });

  it('interpolates variables in filters', async () => {
    const client = makeClient();
    const spec: AlertManagerSilencesQuerySpec = {
      filters: ['team="$team"'],
    };
    const context = createContext(client);
    context.variableState = {
      team: { value: 'ops', loading: false },
    };

    await getSilencesData(spec, context as unknown as Parameters<typeof getSilencesData>[1]);

    expect(client.getSilences).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: ['team="ops"'],
      })
    );
  });
});
