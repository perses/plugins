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

import { exportSearch } from './splunk-client';

function mockFetch(body: string): typeof fetch {
  return (async () => new Response(body, { status: 200 })) as typeof fetch;
}

const params = { search: 'search index=main' };

describe('exportSearch', () => {
  it('returns the result of each line', async () => {
    const body = ['{"preview":false,"offset":0,"result":{"a":"1"}}', '{"preview":false,"offset":1,"result":{"a":"2"}}'];
    const response = await exportSearch(params, {
      datasourceUrl: 'http://splunk',
      fetch: mockFetch(body.join('\n')),
    });
    expect(response.results).toEqual([{ a: '1' }, { a: '2' }]);
  });

  it('skips lines that carry no result', async () => {
    const body = [
      '{"preview":false,"offset":0,"result":{"a":"1"}}',
      '{"messages":[{"type":"WARN","text":"slow"}]}',
      '',
    ];
    const response = await exportSearch(params, {
      datasourceUrl: 'http://splunk',
      fetch: mockFetch(body.join('\n')),
    });
    expect(response.results).toEqual([{ a: '1' }]);
  });

  it('names the Splunk export response when a line is not valid JSON', async () => {
    await expect(
      exportSearch(params, { datasourceUrl: 'http://splunk', fetch: mockFetch('not json') }),
    ).rejects.toThrow('Splunk Export API returned a line that is not valid JSON: not json');
  });
});
