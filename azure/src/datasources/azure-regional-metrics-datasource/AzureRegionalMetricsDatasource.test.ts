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

import type * as ClientModule from '@perses-dev/client';

import type { AzureMetricsBatchQueryRequestOptions, Value } from './azure-regional-metrics-datasource-types';
import { AzureRegionalMetricsDatasource } from './AzureRegionalMetricsDatasource';
import { AZURE_METRICS_BATCH_MAX_REQUESTS_PER_QUERY_DEFAULT, MAX_RESOURCE_IDS_PER_BATCH } from './constants';

type FetchResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

const fetchMock = vi.hoisted(() => vi.fn());
vi.mock('@perses-dev/client', async (importOriginal) => ({
  ...(await importOriginal<typeof ClientModule>()),
  fetch: (...args: unknown[]): Promise<FetchResponse> => fetchMock(...args),
}));

function mockOkResponse(body: unknown): FetchResponse {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  };
}

function mockErrorResponse(status: number, body?: unknown): FetchResponse {
  return {
    ok: false,
    status,
    json:
      body !== undefined
        ? (): Promise<unknown> => Promise.resolve(body)
        : (): Promise<unknown> => Promise.reject(new Error('invalid json')),
  };
}

function mockValue(resourceid: string): Value {
  return {
    starttime: '2024-01-01T00:00:00.000Z',
    endtime: '2024-01-01T01:00:00.000Z',
    interval: 'PT1H',
    value: [],
    namespace: 'Microsoft.Compute/virtualMachines',
    resourceregion: 'eastus',
    resourceid,
  };
}

const baseRequestOptions: AzureMetricsBatchQueryRequestOptions = {
  subscriptionId: '00000000-0000-0000-0000-000000000000',
  resourceIds: ['/resource/1'],
  queryParameters: {
    metricNames: ['Percentage CPU'],
    metricNamespace: 'Microsoft.Compute/virtualMachines',
    startTime: new Date('2024-01-01T00:00:00.000Z'),
    endTime: new Date('2024-01-01T01:00:00.000Z'),
  },
};

describe('AzureRegionalMetricsDatasource.createClient', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('throws when no directUrl or proxyUrl is available', () => {
    expect(() => AzureRegionalMetricsDatasource.createClient({}, {})).toThrow(
      'No URL specified for AzureRegionalMetricsDatasource client. You can use directUrl in the spec to configure it.',
    );
  });

  it('falls back to proxyUrl when directUrl is not specified', async () => {
    fetchMock.mockResolvedValue(mockOkResponse({ values: [] }));
    const client = AzureRegionalMetricsDatasource.createClient({}, { proxyUrl: 'http://proxy:8080' });

    await client.metricsBatchQuery(baseRequestOptions);

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(
      url.startsWith('http://proxy:8080/subscriptions/00000000-0000-0000-0000-000000000000/metrics:getBatch?'),
    ).toBe(true);
  });

  it('prefers directUrl over proxyUrl', async () => {
    fetchMock.mockResolvedValue(mockOkResponse({ values: [] }));
    const client = AzureRegionalMetricsDatasource.createClient(
      { directUrl: 'http://direct.example' },
      { proxyUrl: 'http://proxy:8080' },
    );

    await client.metricsBatchQuery(baseRequestOptions);

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(
      url.startsWith('http://direct.example/subscriptions/00000000-0000-0000-0000-000000000000/metrics:getBatch?'),
    ).toBe(true);
  });

  it('builds the request URL with only the parameters that are provided', async () => {
    fetchMock.mockResolvedValue(mockOkResponse({ values: [] }));
    const client = AzureRegionalMetricsDatasource.createClient({ directUrl: 'http://direct.example' }, {});

    await client.metricsBatchQuery({
      ...baseRequestOptions,
      queryParameters: {
        ...baseRequestOptions.queryParameters,
        aggregation: ['average', 'maximum'],
        filter: "resourceGroup eq 'rg-1'",
        interval: 'PT5M',
        orderBy: 'average asc',
        rollupBy: 'region',
        top: 10,
      },
    });

    const [url] = fetchMock.mock.calls[0] as [string];
    const params = new URL(url).searchParams;
    expect(params.get('metricnames')).toBe('Percentage CPU');
    expect(params.get('metricnamespace')).toBe('Microsoft.Compute/virtualMachines');
    expect(params.get('aggregation')).toBe('average,maximum');
    expect(params.get('filter')).toBe("resourceGroup eq 'rg-1'");
    expect(params.get('interval')).toBe('PT5M');
    expect(params.get('orderby')).toBe('average asc');
    expect(params.get('rollupby')).toBe('region');
    expect(params.get('starttime')).toBe('2024-01-01T00:00:00.000Z');
    expect(params.get('endtime')).toBe('2024-01-01T01:00:00.000Z');
    expect(params.get('top')).toBe('10');
  });

  it('omits optional parameters when not provided', async () => {
    fetchMock.mockResolvedValue(mockOkResponse({ values: [] }));
    const client = AzureRegionalMetricsDatasource.createClient({ directUrl: 'http://direct.example' }, {});

    await client.metricsBatchQuery(baseRequestOptions);

    const [url] = fetchMock.mock.calls[0] as [string];
    const params = new URL(url).searchParams;
    expect(params.has('aggregation')).toBe(false);
    expect(params.has('filter')).toBe(false);
    expect(params.has('interval')).toBe(false);
    expect(params.has('orderby')).toBe(false);
    expect(params.has('rollupby')).toBe(false);
    expect(params.has('top')).toBe(false);
  });

  it('sends a POST request with the resource ids in the body', async () => {
    fetchMock.mockResolvedValue(mockOkResponse({ values: [] }));
    const client = AzureRegionalMetricsDatasource.createClient({ directUrl: 'http://direct.example' }, {});

    await client.metricsBatchQuery({ ...baseRequestOptions, resourceIds: ['/resource/1', '/resource/2'] });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ resourceids: ['/resource/1', '/resource/2'] });
  });

  it('uses proxy spec headers by default and lets runtime headers override them', async () => {
    fetchMock.mockResolvedValue(mockOkResponse({ values: [] }));
    const client = AzureRegionalMetricsDatasource.createClient(
      {
        directUrl: 'http://direct.example',
        proxy: {
          kind: 'HTTPProxy',
          spec: { url: 'http://direct.example', headers: { Authorization: 'Bearer spec-token' } },
        },
      },
      {},
    );

    await client.metricsBatchQuery(baseRequestOptions);
    let [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer spec-token' });

    fetchMock.mockClear();
    await client.metricsBatchQuery(baseRequestOptions, { Authorization: 'Bearer runtime-token' });
    [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer runtime-token' });
  });

  it('splits resource ids into batches and combines the responses', async () => {
    const resourceIds = Array.from({ length: MAX_RESOURCE_IDS_PER_BATCH + 1 }, (_, i) => `/resource/${i}`);
    const firstBatchIds = resourceIds.slice(0, MAX_RESOURCE_IDS_PER_BATCH);
    const secondBatchIds = resourceIds.slice(MAX_RESOURCE_IDS_PER_BATCH);
    fetchMock
      .mockResolvedValueOnce(mockOkResponse({ values: firstBatchIds.map(mockValue) }))
      .mockResolvedValueOnce(mockOkResponse({ values: secondBatchIds.map(mockValue) }));
    const client = AzureRegionalMetricsDatasource.createClient({ directUrl: 'http://direct.example' }, {});

    const result = await client.metricsBatchQuery({ ...baseRequestOptions, resourceIds });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
    const secondBody = JSON.parse((fetchMock.mock.calls[1] as [string, RequestInit])[1].body as string);
    expect(firstBody.resourceids).toHaveLength(MAX_RESOURCE_IDS_PER_BATCH);
    expect(secondBody.resourceids).toHaveLength(1);
    expect(result.values).toEqual([...firstBatchIds.map(mockValue), ...secondBatchIds.map(mockValue)]);
    expect(result.warning).toBeUndefined();
  });

  it('warns when the number of batches is truncated by maxRequestsPerQuery', async () => {
    const resourceIds = Array.from({ length: MAX_RESOURCE_IDS_PER_BATCH + 1 }, (_, i) => `/resource/${i}`);
    fetchMock.mockResolvedValue(mockOkResponse({ values: [] }));
    const client = AzureRegionalMetricsDatasource.createClient(
      { directUrl: 'http://direct.example', maxRequestsPerQuery: 1 },
      {},
    );

    const result = await client.metricsBatchQuery({ ...baseRequestOptions, resourceIds });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.warning).toBe('Query result truncated due to max requests per query limit.');
  });

  it('uses the default max requests per query when not specified', async () => {
    const resourceIds = Array.from(
      { length: MAX_RESOURCE_IDS_PER_BATCH * AZURE_METRICS_BATCH_MAX_REQUESTS_PER_QUERY_DEFAULT + 1 },
      (_, i) => `/resource/${i}`,
    );
    fetchMock.mockResolvedValue(mockOkResponse({ values: [] }));
    const client = AzureRegionalMetricsDatasource.createClient({ directUrl: 'http://direct.example' }, {});

    const result = await client.metricsBatchQuery({ ...baseRequestOptions, resourceIds });

    expect(fetchMock).toHaveBeenCalledTimes(AZURE_METRICS_BATCH_MAX_REQUESTS_PER_QUERY_DEFAULT);
    expect(result.warning).toBe('Query result truncated due to max requests per query limit.');
  });

  it('throws an error including the Azure error code and message on failure', async () => {
    fetchMock.mockResolvedValue(
      mockErrorResponse(400, { error: { code: 'BadRequest', message: 'Invalid metric name' } }),
    );
    const client = AzureRegionalMetricsDatasource.createClient({ directUrl: 'http://direct.example' }, {});

    await expect(client.metricsBatchQuery(baseRequestOptions)).rejects.toThrow(
      'Azure metrics batch request failed with status 400: BadRequest - Invalid metric name',
    );
  });

  it('throws a generic error when the error response body cannot be parsed', async () => {
    fetchMock.mockResolvedValue(mockErrorResponse(500));
    const client = AzureRegionalMetricsDatasource.createClient({ directUrl: 'http://direct.example' }, {});

    await expect(client.metricsBatchQuery(baseRequestOptions)).rejects.toThrow(
      'Azure metrics batch request failed with status 500',
    );
  });
});

describe('AzureRegionalMetricsDatasource.createInitialOptions', () => {
  it('returns a blank directUrl', () => {
    expect(AzureRegionalMetricsDatasource.createInitialOptions!()).toEqual({ directUrl: '' });
  });
});
