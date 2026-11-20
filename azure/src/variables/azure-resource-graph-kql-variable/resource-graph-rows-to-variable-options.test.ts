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

import { resourceGraphRowsToVariableOptions } from './resource-graph-rows-to-variable-options';

describe('resourceGraphRowsToVariableOptions', () => {
  it('returns an empty array when data is not an array', () => {
    expect(resourceGraphRowsToVariableOptions(undefined)).toEqual([]);
    expect(resourceGraphRowsToVariableOptions(null)).toEqual([]);
    expect(resourceGraphRowsToVariableOptions('not-an-array')).toEqual([]);
    expect(resourceGraphRowsToVariableOptions({ id: 'a' })).toEqual([]);
  });

  it('returns an empty array for an empty data array', () => {
    expect(resourceGraphRowsToVariableOptions([])).toEqual([]);
  });

  it('maps rows using the given label and value column names', () => {
    const data = [
      { name: 'vm-1', id: '/resource/1' },
      { name: 'vm-2', id: '/resource/2' },
    ];
    expect(resourceGraphRowsToVariableOptions(data, 'name', 'id')).toEqual([
      { label: 'vm-1', value: '/resource/1' },
      { label: 'vm-2', value: '/resource/2' },
    ]);
  });

  it('uses the value column name as the label when labelColumnName is not provided', () => {
    const data = [{ id: '/resource/1' }];
    expect(resourceGraphRowsToVariableOptions(data, undefined, 'id')).toEqual([
      { label: '/resource/1', value: '/resource/1' },
    ]);
  });

  it('defaults the value column name when not provided', () => {
    const data = [{ value: '/resource/1' }];
    expect(resourceGraphRowsToVariableOptions(data)).toEqual([{ label: '/resource/1', value: '/resource/1' }]);
  });

  it('skips rows that are not objects', () => {
    const data = [null, 'string-row', 42, { name: 'vm-1', id: '/resource/1' }];
    expect(resourceGraphRowsToVariableOptions(data, 'name', 'id')).toEqual([{ label: 'vm-1', value: '/resource/1' }]);
  });

  it('skips rows missing the label or value column', () => {
    const data = [{ name: 'vm-1' }, { id: '/resource/1' }, { name: 'vm-2', id: '/resource/2' }];
    expect(resourceGraphRowsToVariableOptions(data, 'name', 'id')).toEqual([{ label: 'vm-2', value: '/resource/2' }]);
  });

  it('coerces non-string column values to strings', () => {
    const data = [{ name: 'count', id: 42 }];
    expect(resourceGraphRowsToVariableOptions(data, 'name', 'id')).toEqual([{ label: 'count', value: '42' }]);
  });
});
