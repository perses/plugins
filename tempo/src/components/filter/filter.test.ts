// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the \"License\");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an \"AS IS\" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { splitByUnquotedWhitespace } from './filter';

describe('Filter', () => {
  it.each([
    {
      input: '',
      expected: [],
    },
    {
      input: 'key=value',
      expected: ['key=value'],
    },
    {
      input: 'key=value    key2=value2',
      expected: ['key=value', 'key2=value2'],
    },
    {
      input: 'key="string value value2"',
      expected: ['key="string value value2"'],
    },
    {
      input: 'key=value   key2=value2 key3="string value"',
      expected: ['key=value', 'key2=value2', 'key3="string value"'],
    },
  ])('splitByWhitespace ($input)', ({ input, expected }) => {
    expect(splitByUnquotedWhitespace(input)).toEqual(expected);
  });
});
