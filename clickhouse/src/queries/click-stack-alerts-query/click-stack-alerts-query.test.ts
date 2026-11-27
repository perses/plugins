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

import type { AlertsQueryContext } from '@perses-dev/plugin-system';

import type { ClickStackAlert, ClickStackAlertsParams } from '../../model/click-stack-client';
import { stubDatasourceStore } from '../../test/stubs';
import { buildAlert } from './alerts';
import { ClickStackAlertsQuery } from './ClickStackAlertsQuery';
import { buildAlertsParams } from './get-click-stack-alerts-data';

const now = Date.parse('2026-11-26T14:00:00Z');
const options = { uiUrl: 'http://clickstack:8080/', now };

// As returned by ClickStack 2.47.
const TILE_ALERT: ClickStackAlert = {
  id: '6b082f6e859a84a79ab54932',
  name: 'Log throughput is unusual: {{value}}',
  displayName: 'Log throughput is unusual',
  tags: ['perses-demo', 'team:checkout', 'severity:warning', 'source:ignored', 'https://example.com/doc'],
  message: 'Silenced: shown as suppressed.',
  note: 'https://runbooks.example.com/logs',
  threshold: 1000000,
  thresholdMax: 2000000,
  interval: '1m',
  numConsecutiveWindows: 3,
  thresholdType: 'not_between',
  source: 'tile',
  state: 'ALERT',
  tileId: 'tile 1',
  dashboardId: 'dash1',
  silenced: { by: 'user1', at: '2026-11-26T13:06:42.921Z', until: '2026-12-26T13:06:42.000Z' },
  executionErrors: [
    { timestamp: '2026-11-26T13:00:00Z', type: 'QUERY_ERROR', message: 'old' },
    { timestamp: '2026-11-26T13:15:00Z', type: 'WEBHOOK_ERROR', message: 'Failed to send notification' },
  ],
  createdAt: '2026-11-26T13:06:42.902Z',
  updatedAt: '2026-11-26T13:15:00.067Z',
};

function withState(state: string): unknown {
  return buildAlert({ id: 'a', state }, options);
}

function sourceUrl(alert: Partial<ClickStackAlert>): string | undefined {
  return buildAlert({ id: 'alert/1', ...alert }, options).sourceURL;
}

function condition(alert: Partial<ClickStackAlert>): string | undefined {
  return buildAlert({ id: 'a', threshold: 5, ...alert }, options).annotations.condition;
}

interface AlertsResponse {
  alerts: ClickStackAlert[];
  total: number;
}

function createContext(response: AlertsResponse): {
  context: AlertsQueryContext;
  getAlerts: ReturnType<typeof vi.fn<(params: ClickStackAlertsParams) => Promise<AlertsResponse>>>;
} {
  const getAlerts = vi.fn(async (_params: ClickStackAlertsParams) => response);
  const client = { options: { datasourceUrl: '/proxy', uiUrl: 'http://clickstack:8080' }, getAlerts };
  return { context: { datasourceStore: stubDatasourceStore(client), variableState: {} }, getAlerts };
}

describe('buildAlert', () => {
  it('converts a ClickStack alert', () => {
    expect(buildAlert(TILE_ALERT, options)).toEqual({
      id: '6b082f6e859a84a79ab54932',
      // The display name: `name` is the title template of the notifications.
      name: 'Log throughput is unusual',
      state: 'firing',
      labels: {
        alertname: 'Log throughput is unusual',
        // A `key:value` tag is a label, unless it would replace a label of the alert.
        source: 'tile',
        interval: '1m',
        team: 'checkout',
        severity: 'warning',
        tags: 'perses-demo,source:ignored,https://example.com/doc',
      },
      annotations: {
        message: 'Silenced: shown as suppressed.',
        note: 'https://runbooks.example.com/logs',
        // A note that is a link is the runbook of the alert.
        runbook_url: 'https://runbooks.example.com/logs',
        title: 'Log throughput is unusual: {{value}}',
        condition: 'not between 1000000 and 2000000 over 1m, for 3 consecutive windows',
        error: 'WEBHOOK_ERROR: Failed to send notification',
        silenced_until: '2026-12-26T13:06:42.000Z',
      },
      severity: 'warning',
      // ClickStack does not tell when an alert started firing: this is its last evaluation.
      startsAt: '2026-11-26T13:15:00.067Z',
      updatedAt: '2026-11-26T13:15:00.067Z',
      sourceURL: 'http://clickstack:8080/dashboards/dash1?highlightedTileId=tile%201',
      suppressed: true,
      suppressedBy: [{ type: 'silence', id: 'user1' }],
    });
  });

  it('maps the states of ClickStack', () => {
    expect(withState('ALERT')).toMatchObject({ state: 'firing' });
    expect(withState('PENDING')).toMatchObject({ state: 'pending' });
    expect(withState('OK')).toMatchObject({ state: 'inactive', annotations: {} });
    // States that ClickStack does not set yet stay readable.
    expect(withState('INSUFFICIENT_DATA')).toMatchObject({
      state: 'inactive',
      annotations: { clickstack_state: 'INSUFFICIENT_DATA' },
    });
  });

  it('does not suppress an alert whose silence is over', () => {
    const alert = buildAlert({ ...TILE_ALERT, silenced: { until: '2026-11-26T13:59:59Z' } }, options);

    expect(alert.suppressed).toBeUndefined();
    expect(alert.annotations.silenced_until).toBeUndefined();
  });

  it('links to what the alert watches', () => {
    expect(sourceUrl({ source: 'saved_search', savedSearchId: 's1' })).toBe('http://clickstack:8080/search/s1');
    expect(sourceUrl({ source: 'inline' })).toBe('http://clickstack:8080/chart?alertId=alert%2F1');
    expect(sourceUrl({ source: 'tile' })).toBe('http://clickstack:8080/alerts');
    // No link without the URL of the ClickStack UI.
    expect(buildAlert({ id: 'a', source: 'tile', dashboardId: 'd' }, { now }).sourceURL).toBeUndefined();
  });

  it('writes the condition of each kind of threshold', () => {
    expect(condition({ thresholdType: 'above', interval: '5m' })).toBe('>= 5 over 5m');
    expect(condition({ thresholdType: 'below_or_equal' })).toBe('<= 5');
    expect(condition({ thresholdType: 'between', thresholdMax: 9 })).toBe('between 5 and 9');
    expect(condition({ thresholdType: 'anomaly' })).toBe('anomaly 5');
  });
});

describe('buildAlertsParams', () => {
  it('lists the firing and pending alerts by default', () => {
    expect(buildAlertsParams({}, {})).toEqual({ states: ['ALERT', 'PENDING'] });
    expect(buildAlertsParams({ states: [], sources: [], tags: [], search: ' ' }, {})).toEqual({
      states: ['ALERT', 'PENDING'],
    });
  });

  it('replaces the variables: one tag per value of a variable', () => {
    const variableState = {
      team: { value: ['checkout', 'platform'], loading: false },
      env: { value: 'prod', loading: false },
      name: { value: 'cart', loading: false },
    };

    expect(
      buildAlertsParams(
        { states: ['OK'], sources: ['tile'], tags: ['team:$team', '$env', 'prod'], search: '$name errors' },
        variableState,
      ),
    ).toEqual({
      states: ['OK'],
      sources: ['tile'],
      tags: ['team:checkout', 'team:platform', 'prod'],
      search: 'cart errors',
    });
  });
});

describe('ClickStackAlertsQuery', () => {
  it('returns the alerts of ClickStack, with links to its UI', async () => {
    const { context, getAlerts } = createContext({ alerts: [TILE_ALERT], total: 1 });

    const response = await ClickStackAlertsQuery.getAlertsData({ tags: ['prod'] }, context);

    expect(getAlerts).toHaveBeenCalledWith({ states: ['ALERT', 'PENDING'], tags: ['prod'], signal: undefined });
    expect(response.alerts.map((alert) => [alert.name, alert.sourceURL])).toEqual([
      ['Log throughput is unusual', 'http://clickstack:8080/dashboards/dash1?highlightedTileId=tile%201'],
    ]);
    expect(response.metadata).toEqual({
      executedQueryString: 'GET /api/v2/alerts?state=ALERT&state=PENDING&tag=prod',
    });
  });

  it('warns when not all the alerts are shown', async () => {
    const { context } = createContext({ alerts: [{ id: 'a' }], total: 7000 });

    const response = await ClickStackAlertsQuery.getAlertsData({}, context);

    expect(response.metadata?.notices).toEqual([
      { type: 'warning', message: 'Only the first 1 of the 7000 alerts are shown.' },
    ]);
  });

  it('depends on the variables of its filters and of its datasource', () => {
    expect(
      ClickStackAlertsQuery.dependsOn?.(
        { datasource: '$ds', tags: ['team:$team'], search: '${name}' },
        createContext({ alerts: [], total: 0 }).context,
      ),
    ).toEqual({ variables: ['team', 'name', 'ds'] });
  });
});
