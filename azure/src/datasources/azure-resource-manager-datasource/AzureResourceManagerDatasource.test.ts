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

import { STATUS_CODES } from 'http';

import type {
  AzureResourceGraphApiErrorResponseBody,
  AzureResourceGraphApiSuccessResponseBody,
  ResourceGraphQueryRequestParameters,
} from './azure-resource-manager-datasource-types';
import { AzureResourceManagerDatasource } from './AzureResourceManagerDatasource';
import { AZURE_RESOURCE_GRAPH_MAX_REQUESTS_PER_QUERY_DEFAULT } from './constants';

const fetchMock = vi.spyOn(globalThis, 'fetch');

function mockOkResponse(response: AzureResourceGraphApiSuccessResponseBody, status = 200): Response {
  return new Response(JSON.stringify(response), {
    status,
    statusText: STATUS_CODES[status],
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockErrorResponse(response?: AzureResourceGraphApiErrorResponseBody, status = 400): Response {
  return new Response(JSON.stringify(response), {
    status,
    statusText: STATUS_CODES[status],
    headers: { 'Content-Type': 'application/json' },
  });
}

const baseParams: ResourceGraphQueryRequestParameters = {
  kqlQuery: 'Resources | project id, name',
};

describe('AzureResourceManagerDatasource.createClient', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterAll(() => {
    fetchMock.mockRestore();
  });

  it('throws when no directUrl or proxyUrl is available', () => {
    expect(() => AzureResourceManagerDatasource.createClient({}, {})).toThrow(
      'No URL specified for AzureResourceManagerDatasource client. You can use directUrl in the spec to configure it.',
    );
  });

  it('falls back to proxyUrl when directUrl is not specified', async () => {
    fetchMock.mockResolvedValue(mockOkResponse({ count: 0, data: [], resultTruncated: 'false', totalRecords: 0 }));
    const client = AzureResourceManagerDatasource.createClient({}, { proxyUrl: 'http://proxy:8080' });

    await client.resourceGraphQuery(baseParams);

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url.startsWith('http://proxy:8080/providers/Microsoft.ResourceGraph/resources?')).toBe(true);
  });

  it('prefers directUrl over proxyUrl', async () => {
    fetchMock.mockResolvedValue(mockOkResponse({ count: 0, data: [], resultTruncated: 'false', totalRecords: 0 }));
    const client = AzureResourceManagerDatasource.createClient(
      { directUrl: 'http://direct.example' },
      { proxyUrl: 'http://proxy:8080' },
    );

    await client.resourceGraphQuery(baseParams);

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url.startsWith('http://direct.example/providers/Microsoft.ResourceGraph/resources?')).toBe(true);
  });

  it('sends the kql query, subscriptions and management groups in the body with no $skipToken', async () => {
    fetchMock.mockResolvedValue(mockOkResponse({ count: 0, data: [], resultTruncated: 'false', totalRecords: 0 }));
    const client = AzureResourceManagerDatasource.createClient({ directUrl: 'http://direct.example' }, {});

    await client.resourceGraphQuery({
      kqlQuery: 'Resources',
      subscriptions: ['00000000-0000-0000-0000-000000000000'],
      managementGroups: ['mg-1'],
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      query: 'Resources',
      subscriptions: ['00000000-0000-0000-0000-000000000000'],
      managementGroups: ['mg-1'],
      options: undefined,
    });
  });

  it('uses proxy spec headers by default and lets runtime headers override them', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(mockOkResponse({ count: 0, data: [], resultTruncated: 'false', totalRecords: 0 })),
    );
    const client = AzureResourceManagerDatasource.createClient(
      {
        directUrl: 'http://direct.example',
        proxy: {
          kind: 'HTTPProxy',
          spec: { url: 'http://direct.example', headers: { Authorization: 'Bearer spec-token' } },
        },
      },
      {},
    );

    await client.resourceGraphQuery(baseParams);
    let [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer spec-token' });

    fetchMock.mockClear();
    await client.resourceGraphQuery(baseParams, { Authorization: 'Bearer runtime-token' });
    [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer runtime-token' });
  });

  it('follows $skipToken pagination and combines the data from each page', async () => {
    fetchMock
      .mockResolvedValueOnce(
        mockOkResponse({
          $skipToken: 'token-1',
          count: 1,
          data: [{ id: 'a', value: 1 }],
          resultTruncated: 'true',
          totalRecords: 3,
        }),
      )
      .mockResolvedValueOnce(
        mockOkResponse({
          count: 2,
          data: [
            { id: 'b', value: 2 },
            { id: 'c', value: 3 },
          ],
          resultTruncated: 'false',
          totalRecords: 3,
        }),
      );
    const client = AzureResourceManagerDatasource.createClient({ directUrl: 'http://direct.example' }, {});

    const result = await client.resourceGraphQuery(baseParams);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse((fetchMock.mock.calls[1] as [string, RequestInit])[1].body as string);
    expect(secondBody.options).toEqual({ $skipToken: 'token-1' });
    expect(result.data).toEqual([
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
      { id: 'c', value: 3 },
    ]);
    expect(result.warning).toBeUndefined();
  });

  it('warns when results are truncated by the default maxRequestsPerQuery', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        mockOkResponse({
          $skipToken: 'next-token',
          count: 1,
          data: [{ id: 'a' }],
          resultTruncated: 'true',
          totalRecords: 100,
        }),
      ),
    );
    const client = AzureResourceManagerDatasource.createClient({ directUrl: 'http://direct.example' }, {});

    const result = await client.resourceGraphQuery(baseParams);

    expect(fetchMock).toHaveBeenCalledTimes(AZURE_RESOURCE_GRAPH_MAX_REQUESTS_PER_QUERY_DEFAULT);
    expect(result.warning).toBe('Query result truncated due to max requests per query limit.');
  });

  it('respects a custom maxRequestsPerQuery', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        mockOkResponse({
          $skipToken: 'next-token',
          count: 1,
          data: [{ id: 'a' }],
          resultTruncated: 'true',
          totalRecords: 100,
        }),
      ),
    );
    const client = AzureResourceManagerDatasource.createClient(
      { directUrl: 'http://direct.example', maxRequestsPerQuery: 2 },
      {},
    );

    const result = await client.resourceGraphQuery(baseParams);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.warning).toBe('Query result truncated due to max requests per query limit.');
  });

  it('throws an error including the Azure error code and message on failure', async () => {
    fetchMock.mockResolvedValue(
      mockErrorResponse({ error: { code: 'BadRequest', message: 'Invalid KQL query', details: [] } }),
    );
    const client = AzureResourceManagerDatasource.createClient({ directUrl: 'http://direct.example' }, {});

    await expect(client.resourceGraphQuery(baseParams)).rejects.toThrow(
      'Azure resource graph request failed with status 400: BadRequest - Invalid KQL query',
    );
  });

  it('throws a generic error when the error response body cannot be parsed', async () => {
    fetchMock.mockResolvedValue(mockErrorResponse(undefined, 500));
    const client = AzureResourceManagerDatasource.createClient({ directUrl: 'http://direct.example' }, {});

    await expect(client.resourceGraphQuery(baseParams)).rejects.toThrow(
      'Azure resource graph request failed with status 500',
    );
  });
});

describe('AzureResourceManagerDatasource.createInitialOptions', () => {
  it('returns a blank directUrl and the default maxRequestsPerQuery', () => {
    expect(AzureResourceManagerDatasource.createInitialOptions!()).toEqual({
      directUrl: '',
      maxRequestsPerQuery: AZURE_RESOURCE_GRAPH_MAX_REQUESTS_PER_QUERY_DEFAULT,
    });
  });
});
