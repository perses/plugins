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

import { DatasourceSpec } from '@perses-dev/core';
import { TraceQueryContext } from '@perses-dev/plugin-system';
import { TempoDatasourceSpec } from '../tempo-datasource-types';
import { TempoDatasource } from '../tempo-datasource';
import { DEFAULT_SEARCH_LIMIT, SearchResponse } from '../../model/api-types';
import { getTraceData } from './get-trace-data';

const datasource: TempoDatasourceSpec = {
  directUrl: '/test',
};

const createMockClient = (searchResponse: SearchResponse) => {
  const client = TempoDatasource.createClient(datasource, {});
  client.searchWithFallback = jest.fn(async () => searchResponse);
  return client;
};

const getDatasource: jest.Mock = jest.fn((): DatasourceSpec<TempoDatasourceSpec> => {
  return {
    default: false,
    plugin: {
      kind: 'TempoDatasource',
      spec: datasource,
    },
  };
});

const createStubContext = (mockClient: ReturnType<typeof createMockClient>): TraceQueryContext => {
  const getDatasourceClient = jest.fn(() => Promise.resolve(mockClient));
  return {
    variableState: {},
    datasourceStore: {
      getDatasource,
      getDatasourceClient,
      listDatasourceSelectItems: jest.fn(),
      getLocalDatasources: jest.fn(),
      setLocalDatasources: jest.fn(),
      getSavedDatasources: jest.fn(),
      setSavedDatasources: jest.fn(),
    },
    absoluteTimeRange: {
      start: new Date('2023-12-16T21:57:48.057Z'),
      end: new Date('2023-12-16T22:57:48.057Z'),
    },
  } as TraceQueryContext;
};

describe('getTraceData', () => {
  it('should fetch DEFAULT_SEARCH_LIMIT+1 results and not show notice when results are within limit', async () => {
    const mockResponse: SearchResponse = {
      traces: [
        {
          traceID: 'trace1',
          rootServiceName: 'service1',
          rootTraceName: 'trace1',
          startTimeUnixNano: '1718122135898442804',
          durationMs: 100,
        },
        {
          traceID: 'trace2',
          rootServiceName: 'service2',
          rootTraceName: 'trace2',
          startTimeUnixNano: '1718122135898442805',
          durationMs: 200,
        },
      ],
    };
    const mockClient = createMockClient(mockResponse);
    const stubContext = createStubContext(mockClient);
    const result = await getTraceData({ query: '{}' }, stubContext);

    // Verify client was called with limit+1
    expect(mockClient.searchWithFallback).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: DEFAULT_SEARCH_LIMIT + 1,
      })
    );

    // Verify no notice is shown
    expect(result.metadata?.notices).toEqual([]);
    expect(result.metadata?.hasMoreResults).toBe(false);

    // Verify all results are returned
    expect(result.searchResult).toHaveLength(2);
  });

  it('should show notice and trim results when response has more than limit', async () => {
    const customLimit = 5;

    // Create customLimit+1 traces
    const traces = Array.from({ length: customLimit + 1 }, (_, i) => ({
      traceID: `trace${i}`,
      rootServiceName: `service${i}`,
      rootTraceName: `trace${i}`,
      startTimeUnixNano: `${i}`,
      durationMs: 100 * (i + 1),
    }));
    const mockResponse: SearchResponse = { traces };
    const mockClient = createMockClient(mockResponse);
    const stubContext = createStubContext(mockClient);
    const result = await getTraceData({ query: '{}', limit: customLimit }, stubContext);

    // Verify client was called with customLimit+1
    expect(mockClient.searchWithFallback).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: customLimit + 1,
      })
    );

    // Verify notice is present
    expect(result.metadata?.notices).toHaveLength(1);
    expect(result.metadata?.notices?.[0]).toEqual({
      type: 'info',
      message: 'Not all matching traces are currently displayed. Increase the result limit to view additional traces.',
    });
    expect(result.metadata?.hasMoreResults).toBe(true);

    // Verify results are trimmed to exactly customLimit
    expect(result.searchResult).toHaveLength(customLimit);
  });
});
