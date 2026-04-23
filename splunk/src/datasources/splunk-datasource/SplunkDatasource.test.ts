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

import { SplunkDatasource } from './index';

describe('SplunkDatasource', () => {
  it('should create initial options with an empty directUrl', () => {
    const initialOptions = SplunkDatasource.createInitialOptions();
    expect(initialOptions).toEqual({ directUrl: '' });
  });

  it('should create a client when a directUrl is provided', () => {
    const client = SplunkDatasource.createClient({ directUrl: 'https://splunk.example.com' }, {});
    expect(client).toBeDefined();
    expect(client.options.datasourceUrl).toBe('https://splunk.example.com');
    expect(typeof client.createJob).toBe('function');
    expect(typeof client.getJobStatus).toBe('function');
    expect(typeof client.getJobResults).toBe('function');
  });

  it('should throw when neither directUrl nor proxyUrl is provided', () => {
    expect(() => SplunkDatasource.createClient({}, {})).toThrow(/No URL specified for Splunk client/);
  });
});
