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

import { createSilence, deleteSilence, getAlerts, getSilence, getSilences, getStatus } from './alertmanager-client';

type FetchResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
};

const fetchMock = jest.fn();
jest.mock('@perses-dev/core', () => ({
  ...jest.requireActual('@perses-dev/core'),
  fetch: (...args: unknown[]): Promise<FetchResponse> => fetchMock(...args),
}));

function mockOkResponse(body: unknown): FetchResponse {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(body),
  };
}

function mockErrorResponse(status: number, statusText: string, body?: unknown): FetchResponse {
  return {
    ok: false,
    status,
    statusText,
    json:
      body !== undefined
        ? (): Promise<unknown> => Promise.resolve(body)
        : (): Promise<unknown> => Promise.reject(new Error('no body')),
  };
}

describe('alertmanager-client', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  describe('getAlerts', () => {
    it('calls GET /api/v2/alerts with no params', async () => {
      fetchMock.mockResolvedValueOnce(mockOkResponse([]));

      await getAlerts(undefined, { datasourceUrl: 'http://am.example' });

      expect(fetchMock).toHaveBeenCalledWith('http://am.example/api/v2/alerts', {
        method: 'GET',
        headers: {},
      });
    });

    it('appends filter params as repeated query parameters', async () => {
      fetchMock.mockResolvedValueOnce(mockOkResponse([]));

      await getAlerts(
        {
          filter: ['alertname="TestAlert"', 'severity="critical"'],
          silenced: true,
          inhibited: false,
          active: true,
          receiver: 'team-a',
        },
        { datasourceUrl: 'http://am.example' }
      );

      expect(fetchMock).toHaveBeenCalledWith(
        'http://am.example/api/v2/alerts?filter=alertname%3D%22TestAlert%22&filter=severity%3D%22critical%22&silenced=true&inhibited=false&active=true&receiver=team-a',
        {
          method: 'GET',
          headers: {},
        }
      );
    });

    it('passes custom headers', async () => {
      fetchMock.mockResolvedValueOnce(mockOkResponse([]));

      await getAlerts(undefined, {
        datasourceUrl: 'http://am.example',
        headers: { Authorization: 'Bearer token123' },
      });

      expect(fetchMock).toHaveBeenCalledWith('http://am.example/api/v2/alerts', {
        method: 'GET',
        headers: { Authorization: 'Bearer token123' },
      });
    });

    it('parses alert response JSON', async () => {
      const mockAlerts = [
        {
          labels: { alertname: 'TestAlert' },
          annotations: { summary: 'Test' },
          startsAt: '2024-01-01T00:00:00Z',
          endsAt: '2024-01-01T01:00:00Z',
          fingerprint: 'abc123',
          status: { state: 'active', silencedBy: [], inhibitedBy: [] },
          receivers: [{ name: 'default' }],
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];
      fetchMock.mockResolvedValueOnce(mockOkResponse(mockAlerts));

      const result = await getAlerts(undefined, { datasourceUrl: 'http://am.example' });

      expect(result).toEqual(mockAlerts);
      expect(result[0]?.labels.alertname).toBe('TestAlert');
    });

    it('throws on non-ok response with JSON error body', async () => {
      fetchMock.mockResolvedValueOnce(
        mockErrorResponse(500, 'Internal Server Error', { message: 'backend overloaded' })
      );

      await expect(getAlerts(undefined, { datasourceUrl: 'http://am.example' })).rejects.toThrow('backend overloaded');
    });

    it('throws with statusText when error body has no message', async () => {
      fetchMock.mockResolvedValueOnce(mockErrorResponse(502, 'Bad Gateway'));

      await expect(getAlerts(undefined, { datasourceUrl: 'http://am.example' })).rejects.toThrow('Bad Gateway');
    });
  });

  describe('getSilences', () => {
    it('calls GET /api/v2/silences with no params', async () => {
      fetchMock.mockResolvedValueOnce(mockOkResponse([]));

      await getSilences(undefined, { datasourceUrl: 'http://am.example' });

      expect(fetchMock).toHaveBeenCalledWith('http://am.example/api/v2/silences', {
        method: 'GET',
        headers: {},
      });
    });

    it('appends filter params', async () => {
      fetchMock.mockResolvedValueOnce(mockOkResponse([]));

      await getSilences({ filter: ['alertname="TestAlert"'] }, { datasourceUrl: 'http://am.example' });

      expect(fetchMock).toHaveBeenCalledWith('http://am.example/api/v2/silences?filter=alertname%3D%22TestAlert%22', {
        method: 'GET',
        headers: {},
      });
    });
  });

  describe('getSilence', () => {
    it('calls GET /api/v2/silence/{id} with URL-encoded id', async () => {
      fetchMock.mockResolvedValueOnce(
        mockOkResponse({
          id: 'silence-123',
          status: { state: 'active' },
          matchers: [],
        })
      );

      await getSilence('silence/123', { datasourceUrl: 'http://am.example' });

      expect(fetchMock).toHaveBeenCalledWith('http://am.example/api/v2/silence/silence%2F123', {
        method: 'GET',
        headers: {},
      });
    });
  });

  describe('createSilence', () => {
    it('calls POST /api/v2/silences with JSON body', async () => {
      fetchMock.mockResolvedValueOnce(mockOkResponse({ silenceID: 'new-id-123' }));

      const silence = {
        comment: 'Maintenance window',
        createdBy: 'admin',
        startsAt: '2024-01-01T00:00:00Z',
        endsAt: '2024-01-01T04:00:00Z',
        matchers: [{ name: 'alertname', value: 'TestAlert', isRegex: false, isEqual: true }],
      };

      const result = await createSilence(silence, { datasourceUrl: 'http://am.example' });

      expect(fetchMock).toHaveBeenCalledWith('http://am.example/api/v2/silences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(silence),
      });
      expect(result).toEqual({ silenceID: 'new-id-123' });
    });
  });

  describe('deleteSilence', () => {
    it('calls DELETE /api/v2/silence/{id}', async () => {
      fetchMock.mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK' });

      await deleteSilence('silence-456', { datasourceUrl: 'http://am.example' });

      expect(fetchMock).toHaveBeenCalledWith('http://am.example/api/v2/silence/silence-456', {
        method: 'DELETE',
        headers: {},
      });
    });

    it('throws with JSON error message on non-ok response', async () => {
      fetchMock.mockResolvedValueOnce(mockErrorResponse(400, 'Bad Request', { message: 'silence already expired' }));

      await expect(deleteSilence('silence-456', { datasourceUrl: 'http://am.example' })).rejects.toThrow(
        'silence already expired'
      );
    });

    it('throws with statusText when error response has no JSON body', async () => {
      fetchMock.mockResolvedValueOnce(mockErrorResponse(500, 'Internal Server Error'));

      await expect(deleteSilence('silence-456', { datasourceUrl: 'http://am.example' })).rejects.toThrow(
        'Internal Server Error'
      );
    });

    it('throws with statusText when error JSON has no message field', async () => {
      fetchMock.mockResolvedValueOnce(mockErrorResponse(403, 'Forbidden', { error: 'not authorized' }));

      await expect(deleteSilence('silence-456', { datasourceUrl: 'http://am.example' })).rejects.toThrow('Forbidden');
    });
  });

  describe('getStatus', () => {
    it('calls GET /api/v2/status', async () => {
      const mockStatus = {
        cluster: { status: 'ready', peers: [] },
        config: { original: '' },
        uptime: '2024-01-01T00:00:00Z',
        versionInfo: {
          branch: 'main',
          buildDate: '2024-01-01',
          buildUser: 'ci',
          goVersion: '1.21',
          revision: 'abc',
          version: '0.27.0',
        },
      };
      fetchMock.mockResolvedValueOnce(mockOkResponse(mockStatus));

      const result = await getStatus({ datasourceUrl: 'http://am.example' });

      expect(fetchMock).toHaveBeenCalledWith('http://am.example/api/v2/status', {
        method: 'GET',
        headers: {},
      });
      expect(result.versionInfo.version).toBe('0.27.0');
    });
  });

  describe('error handling', () => {
    it('throws on invalid JSON response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.reject(new Error('Unexpected token')),
      });

      await expect(getAlerts(undefined, { datasourceUrl: 'http://am.example' })).rejects.toThrow(
        'Invalid response from server'
      );
    });
  });
});
