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

import { createCloudWatchClient } from './cloudwatch-client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/x-amz-json-1.0' } });
}

function createClient(...responses: Response[]): {
  client: ReturnType<typeof createCloudWatchClient>;
  fetch: ReturnType<typeof vi.fn>;
} {
  const fetch = vi.fn();
  for (const response of responses) {
    fetch.mockResolvedValueOnce(response);
  }
  return { client: createCloudWatchClient({ datasourceUrl: '/proxy/projects/p/datasources/cw', fetch }), fetch };
}

function requestOf(fetch: ReturnType<typeof vi.fn>, call = 0): { init: RequestInit; body: Record<string, unknown> } {
  const init = fetch.mock.calls[call]?.[1] as RequestInit;
  return { init, body: JSON.parse(init.body as string) };
}

describe('getMetricData', () => {
  const params = {
    startTime: '2026-09-30T10:00:00.000Z',
    endTime: '2026-09-30T11:00:00.000Z',
    queries: [
      {
        id: 'm1',
        returnData: false,
        metric: {
          namespace: 'AWS/EC2',
          name: 'CPUUtilization',
          dimensions: { InstanceId: 'i-1' },
          statistic: 'Average',
          period: 60,
        },
      },
      { id: 'e1', expression: 'm1 * 2', label: 'CPU x2' },
    ],
  };

  it('calls GetMetricData with the AWS JSON 1.0 protocol through the proxy', async () => {
    const { client, fetch } = createClient(jsonResponse({ MetricDataResults: [] }));

    await client.getMetricData(params);

    expect(fetch.mock.calls[0]?.[0]).toBe('/proxy/projects/p/datasources/cw');
    const { init, body } = requestOf(fetch);
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      'Content-Type': 'application/x-amz-json-1.0',
      'X-Amz-Target': 'GraniteServiceVersion20100801.GetMetricData',
    });
    expect(body).toEqual({
      StartTime: Date.parse('2026-09-30T10:00:00Z') / 1000,
      EndTime: Date.parse('2026-09-30T11:00:00Z') / 1000,
      ScanBy: 'TimestampAscending',
      MetricDataQueries: [
        {
          Id: 'm1',
          ReturnData: false,
          MetricStat: {
            Metric: {
              Namespace: 'AWS/EC2',
              MetricName: 'CPUUtilization',
              Dimensions: [{ Name: 'InstanceId', Value: 'i-1' }],
            },
            Period: 60,
            Stat: 'Average',
          },
        },
        { Id: 'e1', Label: 'CPU x2', Expression: 'm1 * 2' },
      ],
    });
  });

  it('merges the pages and converts the timestamps to milliseconds', async () => {
    const t0 = Date.parse('2026-09-30T10:00:00Z') / 1000;
    const { client, fetch } = createClient(
      jsonResponse({
        MetricDataResults: [{ Id: 'e1', Label: 'CPU x2', Timestamps: [t0], Values: [1], StatusCode: 'PartialData' }],
        NextToken: 'next',
      }),
      jsonResponse({
        MetricDataResults: [{ Id: 'e1', Label: 'CPU x2', Timestamps: [t0 + 60], Values: [2], StatusCode: 'Complete' }],
      }),
    );

    const response = await client.getMetricData(params);

    expect(requestOf(fetch, 1).body.NextToken).toBe('next');
    expect(response.MetricDataResults).toEqual([
      { Id: 'e1', Label: 'CPU x2', Timestamps: [t0 * 1000, (t0 + 60) * 1000], Values: [1, 2], StatusCode: 'Complete' },
    ]);
  });

  it('reports the AWS errors', async () => {
    const { client } = createClient(
      jsonResponse(
        {
          __type: 'com.amazonaws.cloudwatch#InvalidParameterValueException',
          message: 'The value m1 * for parameter Expression is not valid.',
        },
        400,
      ),
    );
    await expect(client.getMetricData(params)).rejects.toThrow(
      'CloudWatch GetMetricData failed (400) InvalidParameterValueException: The value m1 * for parameter Expression is not valid.',
    );
  });

  it('reports the errors of the Perses proxy', async () => {
    const { client } = createClient(
      new Response(
        JSON.stringify({ message: 'signing the requests with the AWS identity of the Perses server is not allowed' }),
        { status: 403 },
      ),
    );
    await expect(client.getMetricData(params)).rejects.toThrow('(403): signing the requests');
  });

  it.each([
    ['a forbidden query', { MetricDataResults: [{ Id: 'e1', StatusCode: 'Forbidden', Timestamps: [], Values: [] }] }],
    [
      'an error message',
      { MetricDataResults: [], Messages: [{ Code: 'MaxMetricsExceeded', Value: 'too many metrics' }] },
    ],
    ['mismatched values', { MetricDataResults: [{ Id: 'e1', StatusCode: 'Complete', Timestamps: [1], Values: [] }] }],
  ])('rejects %s', async (_, body) => {
    const { client } = createClient(jsonResponse(body));
    await expect(client.getMetricData(params)).rejects.toThrow();
  });
});

const metric = {
  Namespace: 'AWS/EC2',
  MetricName: 'CPUUtilization',
  Dimensions: [{ Name: 'InstanceId', Value: 'i-1' }],
};

function metricsPage(token?: string): Response {
  return jsonResponse({ Metrics: Array.from({ length: 500 }, () => metric), NextToken: token });
}

describe('listMetrics', () => {
  it('calls ListMetrics with the filters', async () => {
    const { client, fetch } = createClient(jsonResponse({ Metrics: [metric] }));

    const response = await client.listMetrics({
      namespace: 'AWS/EC2',
      metricName: 'CPUUtilization',
      dimensions: { AutoScalingGroupName: 'web' },
    });

    expect(response).toEqual({ Metrics: [metric], Truncated: false });
    const { init, body } = requestOf(fetch);
    expect((init.headers as Record<string, string>)['X-Amz-Target']).toBe('GraniteServiceVersion20100801.ListMetrics');
    expect(body).toEqual({
      Namespace: 'AWS/EC2',
      MetricName: 'CPUUtilization',
      Dimensions: [{ Name: 'AutoScalingGroupName', Value: 'web' }],
    });
  });

  it('returns the first 1000 metrics of large accounts', async () => {
    const { client, fetch } = createClient(metricsPage('a'), metricsPage('b'), metricsPage());

    const response = await client.listMetrics({ namespace: 'AWS/EC2' });

    expect(response.Metrics).toHaveLength(1000);
    expect(response.Truncated).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
