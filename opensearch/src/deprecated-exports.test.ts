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

import type { OpenSearchDatarowsResponse, OpenSearchPPLColumn, OpenSearchPPLResponse } from './index';
import { convertDatarowsToLogs, convertPPLToLogs, OpenSearchApiError, OpenSearchPPLError } from './index';

// Names renamed when SQL/Lucene/DSL support generalised the PPL-only API. They are part of the
// published package surface, so they stay exported from the package root as deprecated aliases.
describe('deprecated package-root exports', () => {
  it('keeps convertPPLToLogs as an alias of convertDatarowsToLogs', () => {
    expect(convertPPLToLogs).toBe(convertDatarowsToLogs);
  });

  it('keeps OpenSearchPPLError as a subclass of OpenSearchApiError', () => {
    expect(new OpenSearchPPLError(500, '')).toBeInstanceOf(OpenSearchApiError);
  });

  it('keeps OpenSearchPPLResponse and OpenSearchPPLColumn assignable to the new types', () => {
    const column: OpenSearchPPLColumn = { name: 'message', type: 'string' };
    const response: OpenSearchPPLResponse = { schema: [column], datarows: [['hello']] };
    const generalised: OpenSearchDatarowsResponse = response;
    expect(generalised.schema[0]?.name).toBe('message');
  });
});
