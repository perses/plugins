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

import { SplunkLogQuery } from './SplunkLogQuery';
import { LogQueryContext } from './log-query-plugin-interface';

const createStubContext = (): LogQueryContext => ({
  datasourceStore: {
    getDatasource: jest.fn(),
    getDatasourceClient: jest.fn(),
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
});

describe('SplunkLogQuery', () => {
  it('should create initial options with empty query', () => {
    const initialOptions = SplunkLogQuery.createInitialOptions();
    expect(initialOptions).toEqual({ query: '' });
  });

  it('should resolve variable dependencies from the query', () => {
    if (!SplunkLogQuery.dependsOn) throw new Error('dependsOn is not defined');
    const { variables } = SplunkLogQuery.dependsOn(
      {
        query: 'search index=$index sourcetype=$sourcetype error',
      },
      createStubContext()
    );
    expect(variables).toEqual(expect.arrayContaining(['index', 'sourcetype']));
    expect(variables).toHaveLength(2);
  });

  it('should return no variables when the query has no variable references', () => {
    if (!SplunkLogQuery.dependsOn) throw new Error('dependsOn is not defined');
    const { variables } = SplunkLogQuery.dependsOn(
      {
        query: 'search index=main error',
      },
      createStubContext()
    );
    expect(variables).toEqual([]);
  });
});
