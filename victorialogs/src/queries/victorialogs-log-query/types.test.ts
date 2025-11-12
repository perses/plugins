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

import { VictoriaLogsStreamQueryRangeResponse } from '../../model/types';
import { VictoriaLogsDatasource } from '../../datasources/victorialogs-datasource';
import { VictoriaLogsDatasourceSpec } from '../../datasources/victorialogs-datasource/types';
import { VictoriaLogsLogQuery } from './VictoriaLogsLogQuery';
import { LogQueryContext } from './interface';

const datasource: VictoriaLogsDatasourceSpec = {
  directUrl: '/test',
};

const victorialogsStubClient = VictoriaLogsDatasource.createClient(datasource, {});

// Mock range query
victorialogsStubClient.streamQueryRange = jest.fn(async () => {
  return [
    {
      service: 'api',
      level: 'error',
      _time: '1686141338877000000',
      _msg: 'Error processing request',
    },
  ] as VictoriaLogsStreamQueryRangeResponse;
});

const getDatasourceClient: jest.Mock = jest.fn(() => {
  return victorialogsStubClient;
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
    timeRange: {
      end: new Date('01-01-2025'),
      start: new Date('01-02-2025'),
    },
    variableState: {},
  };
  return stubLogContext;
};

describe('VictoriaLogsLogQuery', () => {
  it('should properly resolve variable dependencies', () => {
    if (!VictoriaLogsLogQuery.dependsOn) throw new Error('dependsOn is not defined');
    const { variables } = VictoriaLogsLogQuery.dependsOn(
      {
        query: '{service="$service", level="$level"} |= "error"',
      },
      createStubContext()
    );
    expect(variables).toEqual(['service', 'level']);
  });

  it('should create initial options with empty query', () => {
    const initialOptions = VictoriaLogsLogQuery.createInitialOptions();
    expect(initialOptions).toEqual({ query: '' });
  });
});
