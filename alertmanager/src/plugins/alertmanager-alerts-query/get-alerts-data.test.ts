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

import { AlertsQueryContext } from '@perses-dev/plugin-system';
import { AlertManagerClient, GettableAlert } from '../../model';
import { AlertManagerDatasource } from '../alertmanager-datasource';
import { AlertManagerAlertsQuerySpec } from '../types';
import { getAlertsData } from './get-alerts-data';

const datasource = { directUrl: 'http://am.example' };

const mockAlerts: GettableAlert[] = [
  {
    labels: { alertname: 'HighMemory', severity: 'critical', instance: 'server-1' },
    annotations: { summary: 'Memory usage is above 90%' },
    startsAt: '2024-01-01T00:00:00Z',
    endsAt: '2024-01-01T01:00:00Z',
    fingerprint: 'abc123',
    status: { state: 'active' as const, silencedBy: [], inhibitedBy: [], mutedBy: [] },
    receivers: [{ name: 'default' }],
    updatedAt: '2024-01-01T00:00:00Z',
    generatorURL: 'http://prometheus.example/graph?...',
  },
  {
    labels: { alertname: 'HighCPU', severity: 'warning', instance: 'server-2' },
    annotations: { summary: 'CPU usage is above 80%' },
    startsAt: '2024-01-01T00:30:00Z',
    endsAt: '2024-01-01T01:30:00Z',
    fingerprint: 'def456',
    status: { state: 'suppressed' as const, silencedBy: ['silence-1'], inhibitedBy: [], mutedBy: [] },
    receivers: [{ name: 'team-a' }],
    updatedAt: '2024-01-01T00:30:00Z',
  },
];

const makeClient = (): AlertManagerClient => {
  const client = AlertManagerDatasource.createClient(datasource, {});
  client.getAlerts = jest.fn(async () => mockAlerts);
  return client;
};

function createContext(client: AlertManagerClient): AlertsQueryContext {
  return {
    variableState: {},
    datasourceStore: {
      getDatasource: jest.fn(),
      getDatasourceClient: jest.fn(() =>
        Promise.resolve(client)
      ) as AlertsQueryContext['datasourceStore']['getDatasourceClient'],
      listDatasourceSelectItems: jest.fn(async () => []),
      getLocalDatasources: jest.fn(),
      setLocalDatasources: jest.fn(),
      getSavedDatasources: jest.fn(),
      setSavedDatasources: jest.fn(),
    },
  };
}

describe('getAlertsData', () => {
  it('transforms API alerts into AlertsData format', async () => {
    const client = makeClient();
    const spec: AlertManagerAlertsQuerySpec = {};
    const context = createContext(client);

    const result = await getAlertsData(spec, context as unknown as Parameters<typeof getAlertsData>[1]);

    expect(result.alerts).toHaveLength(2);
    expect(result.alerts[0]).toEqual({
      id: 'abc123',
      name: 'HighMemory',
      state: 'firing',
      labels: { alertname: 'HighMemory', severity: 'critical', instance: 'server-1' },
      annotations: { summary: 'Memory usage is above 90%' },
      severity: 'critical',
      startsAt: '2024-01-01T00:00:00Z',
      endsAt: '2024-01-01T01:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      sourceURL: 'http://prometheus.example/graph?...',
      receivers: ['default'],
    });
  });

  it('maps suppressed alerts with silencedBy info', async () => {
    const client = makeClient();
    const spec: AlertManagerAlertsQuerySpec = {};
    const context = createContext(client);

    const result = await getAlertsData(spec, context as unknown as Parameters<typeof getAlertsData>[1]);

    expect(result.alerts[1]?.suppressed).toBe(true);
    expect(result.alerts[1]?.state).toBe('firing');
    expect(result.alerts[1]?.suppressedBy).toEqual([{ type: 'silence', id: 'silence-1' }]);
  });

  it('passes query parameters to the client', async () => {
    const client = makeClient();
    const spec: AlertManagerAlertsQuerySpec = {
      filters: ['alertname="HighMemory"'],
      active: true,
      silenced: false,
      inhibited: false,
      receiver: 'team-a',
    };
    const context = createContext(client);

    await getAlertsData(spec, context as unknown as Parameters<typeof getAlertsData>[1]);

    expect(client.getAlerts).toHaveBeenCalledWith({
      filter: ['alertname="HighMemory"'],
      active: true,
      silenced: false,
      inhibited: false,
      receiver: 'team-a',
    });
  });

  it('returns empty alerts array when API returns empty', async () => {
    const client = makeClient();
    client.getAlerts = jest.fn(async () => []);
    const spec: AlertManagerAlertsQuerySpec = {};
    const context = createContext(client);

    const result = await getAlertsData(spec, context as unknown as Parameters<typeof getAlertsData>[1]);

    expect(result.alerts).toEqual([]);
  });

  it('interpolates variables in filters and receiver', async () => {
    const client = makeClient();
    const spec: AlertManagerAlertsQuerySpec = {
      filters: ['team="$team"'],
      receiver: '$receiver',
    };
    const context = createContext(client);
    context.variableState = {
      team: { value: 'ops', loading: false },
      receiver: { value: 'slack-ops', loading: false },
    };

    await getAlertsData(spec, context as unknown as Parameters<typeof getAlertsData>[1]);

    expect(client.getAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: ['team="ops"'],
        receiver: 'slack-ops',
      })
    );
  });
});
