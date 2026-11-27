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

import { createClickStackClient, MAX_ALERTS } from './click-stack-client';

function page(alerts: unknown[], total = alerts.length): Response {
  return new Response(JSON.stringify({ data: alerts, meta: { total, limit: 1000, offset: 0 } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeAlerts(count: number, offset = 0): Array<{ id: string }> {
  return Array.from({ length: count }, (_unused, index) => ({ id: String(offset + index) }));
}

function calledUrl(fetchMock: ReturnType<typeof vi.fn<typeof fetch>>, call = 0): URL {
  return new URL(String(fetchMock.mock.calls[call]?.[0]));
}

describe('createClickStackClient', () => {
  it('lists the alerts matching the filters, repeating the ones with several values', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => page([{ id: 'a' }, { name: 'not an alert' }]));
    const client = createClickStackClient({
      datasourceUrl: '/proxy/globaldatasources/clickstack',
      headers: { 'X-Team': 'ops' },
      fetch: fetchMock,
    });

    await expect(
      client.getAlerts({ states: ['ALERT', 'PENDING'], sources: ['tile'], tags: ['team:a', 'prod'], search: 'cart' }),
    ).resolves.toEqual({ alerts: [{ id: 'a' }], total: 2 });

    const url = calledUrl(fetchMock);
    expect(url.origin).toBe(window.location.origin);
    expect(url.pathname).toBe('/proxy/globaldatasources/clickstack/api/v2/alerts');
    expect(url.search).toBe(
      '?state=ALERT&state=PENDING&source=tile&tag=team%3Aa&tag=prod&search=cart&limit=1000&offset=0',
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'GET', headers: { 'X-Team': 'ops' } });
  });

  it('reads the following pages when the first one does not hold every alert', async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const offset = Number(new URL(String(input)).searchParams.get('offset'));
      return page(makeAlerts(Math.min(1000, 2500 - offset), offset), 2500);
    });
    const client = createClickStackClient({ datasourceUrl: 'http://clickstack:8000', fetch: fetchMock });

    const response = await client.getAlerts();

    expect(response.total).toBe(2500);
    expect(response.alerts.map((alert) => alert.id)).toEqual(makeAlerts(2500).map((alert) => alert.id));
    expect(fetchMock.mock.calls.map((_call, index) => calledUrl(fetchMock, index).searchParams.get('offset'))).toEqual([
      '0',
      '1000',
      '2000',
    ]);
  });

  it('stops at the maximum number of alerts', async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) =>
      page(makeAlerts(1000, Number(new URL(String(input)).searchParams.get('offset'))), 20_000),
    );
    const client = createClickStackClient({ datasourceUrl: 'http://clickstack:8000', fetch: fetchMock });

    const response = await client.getAlerts();

    expect(response.alerts).toHaveLength(MAX_ALERTS);
    expect(response.total).toBe(20_000);
    expect(fetchMock).toHaveBeenCalledTimes(MAX_ALERTS / 1000);
  });

  it('tells that the API key is rejected', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response('Unauthorized', { status: 401 }));
    const client = createClickStackClient({ datasourceUrl: 'http://clickstack:8000', fetch: fetchMock });

    await expect(client.getAlerts()).rejects.toThrow(/ClickStack rejected the API key \(401\)/);
  });

  it('reports the message of a failed request', async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response('{"message":"Query validation failed: state.0: Invalid enum value"}', { status: 400 }),
    );
    const client = createClickStackClient({ datasourceUrl: 'http://clickstack:8000', fetch: fetchMock });

    await expect(client.getAlerts({ states: ['NOPE'] })).rejects.toThrow(
      'ClickStack request failed (400): Query validation failed: state.0: Invalid enum value',
    );
  });

  it('rejects an answer that is not a list of alerts', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response('{"version":"v2"}', { status: 200 }));
    const client = createClickStackClient({ datasourceUrl: 'http://clickstack:8000', fetch: fetchMock });

    await expect(client.getAlerts()).rejects.toThrow(/did not answer with a list of alerts/);
  });
});
