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

import { InfluxDBDatasource } from './InfluxDBDatasource';
import { InfluxDBSpec } from './influxdb-datasource-types';

describe('InfluxDBDatasource', () => {
  it('should have createClient method', () => {
    expect(InfluxDBDatasource).toHaveProperty('createClient');
    expect(typeof InfluxDBDatasource.createClient).toBe('function');
  });

  it('should have OptionsEditorComponent', () => {
    expect(InfluxDBDatasource).toHaveProperty('OptionsEditorComponent');
  });

  it('should have createInitialOptions method', () => {
    expect(InfluxDBDatasource).toHaveProperty('createInitialOptions');
    expect(typeof InfluxDBDatasource.createInitialOptions).toBe('function');
  });

  it('should create initial options with version v1 and empty database', () => {
    const initialOptions = InfluxDBDatasource.createInitialOptions();
    expect(initialOptions).toEqual({ version: 'v1', database: '' });
  });

  it('should throw when no URL is provided', () => {
    const spec: InfluxDBSpec = { version: 'v1', database: 'testdb' };
    expect(() => InfluxDBDatasource.createClient(spec, { proxyUrl: undefined })).toThrow(
      'No URL specified for InfluxDB client'
    );
  });

  it('should prefer directUrl over proxyUrl', () => {
    const spec: InfluxDBSpec = { version: 'v1', database: 'testdb', directUrl: 'http://direct:8086' };
    const client = InfluxDBDatasource.createClient(spec, { proxyUrl: 'http://proxy:8086' });
    expect(client.options.datasourceUrl).toBe('http://direct:8086');
  });

  it('should fall back to proxyUrl when directUrl is absent', () => {
    const spec: InfluxDBSpec = { version: 'v1', database: 'testdb' };
    const client = InfluxDBDatasource.createClient(spec, { proxyUrl: 'http://proxy:8086' });
    expect(client.options.datasourceUrl).toBe('http://proxy:8086');
  });

  it('should attach queryV1 method for v1 spec', () => {
    const spec: InfluxDBSpec = { version: 'v1', database: 'testdb', directUrl: 'http://localhost:8086' };
    const client = InfluxDBDatasource.createClient(spec, { proxyUrl: undefined });
    expect(typeof client.queryV1).toBe('function');
    expect(client.queryV3SQL).toBeUndefined();
  });

  it('should attach queryV3SQL and queryV3Flux methods for v3 spec', () => {
    const spec: InfluxDBSpec = {
      version: 'v3',
      organization: 'myorg',
      directUrl: 'http://localhost:8086',
    };
    const client = InfluxDBDatasource.createClient(spec, { proxyUrl: undefined });
    expect(typeof client.queryV3SQL).toBe('function');
    expect(typeof client.queryV3Flux).toBe('function');
    expect(client.queryV1).toBeUndefined();
  });
});
