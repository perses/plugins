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

import { describe, expect, it } from 'vitest';

import { sanitizeUrl } from './link-safety';

describe('sanitizeUrl', () => {
  it.each([
    'https://perses.dev',
    'http://localhost:3000/explore?var-job=node',
    '/projects/perses/dashboards/demo',
    'explore?data=%24var',
    '#panel-1',
    'mailto:perses@example.com',
  ])('keeps the safe URL %j', (url) => {
    expect(sanitizeUrl(url)).toBe(url);
  });

  it.each([
    'javascript:alert(document.domain)',
    'JaVaScRiPt:alert(1)',
    ' javascript:alert(1)',
    '\u0000javascript:alert(1)',
    'java\tscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
  ])('rejects the unsafe URL %j', (url) => {
    expect(sanitizeUrl(url)).toBeUndefined();
  });

  it('returns undefined when there is no URL', () => {
    expect(sanitizeUrl(undefined)).toBeUndefined();
  });
});
