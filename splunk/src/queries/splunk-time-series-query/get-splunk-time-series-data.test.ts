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

import type { TimeSeriesQueryContext } from '@perses-dev/plugin-system';

import type { SplunkClient } from '../../model/splunk-client';
import { getSplunkTimeSeriesData } from './get-splunk-time-series-data';

function buildContext(
  client: Partial<SplunkClient>,
  allowedEndpoints: Array<{ endpointPattern: string }> = [],
): TimeSeriesQueryContext {
  return {
    timeRange: { start: new Date('2026-01-01T00:00:00Z'), end: new Date('2026-01-01T01:00:00Z') },
    variableState: {},
    datasourceStore: {
      getDatasourceClient: async () => client,
      getDatasource: async () => ({ plugin: { spec: { proxy: { spec: { allowedEndpoints } } } } }),
    },
  } as unknown as TimeSeriesQueryContext;
}

describe('getSplunkTimeSeriesData', () => {
  it('leaves a gap for missing or non-numeric values instead of plotting zero', async () => {
    const client = {
      exportSearch: async () => ({
        results: [
          { _time: '2026-01-01T00:00:00Z', count: '5' },
          { _time: '2026-01-01T00:01:00Z', count: '' },
          { _time: '2026-01-01T00:02:00Z', count: 'n/a' },
          { _time: '2026-01-01T00:03:00Z', count: '0' },
        ],
      }),
    } as unknown as SplunkClient;

    const data = await getSplunkTimeSeriesData(
      { query: 'search index=main' },
      buildContext(client, [{ endpointPattern: '/services/search/v2/jobs/export' }]),
    );

    expect(data.series[0]?.values.map(([, value]) => value)).toEqual([5, null, null, 0]);
  });

  it('throws when the job status response is malformed', async () => {
    const client = {
      createJob: async () => ({ sid: 'job-1' }),
      getJobStatus: async () => ({}),
      getJobResults: vi.fn(),
    } as unknown as SplunkClient;

    await expect(getSplunkTimeSeriesData({ query: 'search index=main' }, buildContext(client))).rejects.toThrow(
      'Splunk job job-1 returned a malformed status response',
    );
    expect(client.getJobResults).not.toHaveBeenCalled();
  });
});
