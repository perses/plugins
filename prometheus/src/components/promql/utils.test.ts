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

import { escapeString } from './utils';

describe('escapeString', () => {
  it('should escape backslashes and double quotes', () => {
    expect(escapeString('C:\\dir "x"')).toEqual('C:\\\\dir \\"x\\"');
  });

  it('should escape line breaks', () => {
    expect(escapeString('line1\nline2\r\n')).toEqual('line1\\nline2\\r\\n');
  });

  it('should keep other characters', () => {
    expect(escapeString("it's 100% ok")).toEqual("it's 100% ok");
  });
});
