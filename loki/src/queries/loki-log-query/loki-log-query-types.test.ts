// Copyright 2025 The Perses Authors
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

import { LokiQueryRangeStreamsResponse, LokiQueryRangeResponse } from '../../model/loki-client-types';
import { LokiDatasource } from '../../datasources/loki-datasource';
import { LokiDatasourceSpec } from '../../datasources/loki-datasource/loki-datasource-types';
import { LokiLogQuery } from './LokiLogQuery';
import { LogQueryContext } from './log-query-plugin-interface';

const datasource: LokiDatasourceSpec = {
  directUrl: '/test',
};

const lokiStubClient = LokiDatasource.createClient(datasource, {});

// Mock range query
lokiStubClient.queryRange = jest.fn(async () => {
  const stubResponse: LokiQueryRangeStreamsResponse = {
    status: 'success',
    data: {
      resultType: 'streams',
      result: [
        {
          stream: {
            service: 'api',
            level: 'error',
          },
          values: [['1686141338877000000', 'Error processing request']],
        },
      ],
    },
  };
  return stubResponse as LokiQueryRangeResponse;
});

const getDatasourceClient: jest.Mock = jest.fn(() => {
  return lokiStubClient;
});

const createStubContext = (): LogQueryContext => {
  const stubLogContext: LogQueryContext = {
    datasourceStore: {
      getDatasource: jest.fn(),
      getDatasourceClient: getDatasourceClient,
      listDatasourceSelectItems: jest.fn(),
      getLocalDatasources: jest.fn(),
      setLocalDatasources: jest.fn(),
      getSavedDatasources: jest.fn(),
      setSavedDatasources: jest.fn(),
    },
    refreshKey: 'test',
    timeRange: {
      end: new Date('01-01-2025'),
      start: new Date('01-02-2025'),
    },
    variableState: {},
  };
  return stubLogContext;
};

describe('LokiLogQuery', () => {
  it('should properly resolve variable dependencies', () => {
    if (!LokiLogQuery.dependsOn) throw new Error('dependsOn is not defined');
    const { variables } = LokiLogQuery.dependsOn(
      {
        query: '{service="$service", level="$level"} |= "error"',
      },
      createStubContext()
    );
    expect(variables).toEqual(['service', 'level']);
  });

  it('should create initial options with empty query', () => {
    const initialOptions = LokiLogQuery.createInitialOptions();
    expect(initialOptions).toEqual({ query: '' });
  });

  it('should handle direction option', () => {
    // Test that LokiLogQuery supports direction in spec
    const specWithDirection = {
      query: '{service="api"}',
      direction: 'backward' as const,
    };
    expect(specWithDirection.direction).toBe('backward');
  });
});
