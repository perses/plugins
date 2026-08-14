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

import { buildUrl } from './json-datasource-utils';

describe('buildUrl', () => {
  it('joins base and path, stripping trailing slash from base', () => {
    expect(buildUrl('http://api.example/', '/data')).toBe('http://api.example/data');
  });

  it('prepends slash to path when missing', () => {
    expect(buildUrl('http://api.example', 'data')).toBe('http://api.example/data');
  });

  it('appends query params', () => {
    expect(buildUrl('http://api.example', '/data', { foo: 'bar', baz: 'qux' })).toBe(
      'http://api.example/data?foo=bar&baz=qux'
    );
  });

  it('omits query string when params is empty', () => {
    expect(buildUrl('http://api.example', '/data', {})).toBe('http://api.example/data');
  });

  it('omits query string when params is undefined', () => {
    expect(buildUrl('http://api.example', '/data')).toBe('http://api.example/data');
  });

  it('handles path with no leading slash on base with trailing slash', () => {
    expect(buildUrl('http://api.example/', 'data')).toBe('http://api.example/data');
  });

  it('URL-encodes special characters in query param values', () => {
    const url = buildUrl('http://api.example', '/search', { q: 'hello world' });
    expect(url).toBe('http://api.example/search?q=hello+world');
  });
});
