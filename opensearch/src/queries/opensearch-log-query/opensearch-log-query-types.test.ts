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

import type { OpenSearchQueryLanguage } from './opensearch-log-query-types';
import { resolveQueryLanguage } from './opensearch-log-query-types';

describe('resolveQueryLanguage', () => {
  it('defaults to ppl when queryLanguage is absent', () => {
    expect(resolveQueryLanguage({})).toBe('ppl');
  });

  it.each(['ppl', 'sql', 'lucene', 'dsl'] as const)('resolves a recognised language %s unchanged', (language) => {
    expect(resolveQueryLanguage({ queryLanguage: language })).toBe(language);
  });

  it('falls back to ppl for an out-of-enum queryLanguage', () => {
    // Cast through `as` since 'kql' is not a valid OpenSearchQueryLanguage — this simulates a
    // hand-edited or hand-crafted spec reaching the resolver at runtime, bypassing the type system.
    expect(resolveQueryLanguage({ queryLanguage: 'kql' as OpenSearchQueryLanguage })).toBe('ppl');
  });
});
