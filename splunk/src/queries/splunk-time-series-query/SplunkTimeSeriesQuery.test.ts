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

import { SplunkTimeSeriesQuery } from './SplunkTimeSeriesQuery';

describe('SplunkTimeSeriesQuery', () => {
  it('should create initial options with empty query', () => {
    const initialOptions = SplunkTimeSeriesQuery.createInitialOptions();
    expect(initialOptions).toEqual({ query: '' });
  });

  it('should resolve unique variable dependencies, deduplicating repeats', () => {
    if (!SplunkTimeSeriesQuery.dependsOn) throw new Error('dependsOn is not defined');
    const { variables } = SplunkTimeSeriesQuery.dependsOn(
      {
        query: 'search index=$index sourcetype=$sourcetype | stats count by $index',
      },
      {} as never
    );
    expect(variables).toEqual(expect.arrayContaining(['index', 'sourcetype']));
    expect(variables).toHaveLength(2);
  });
});
