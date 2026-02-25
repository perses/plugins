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

import { InfluxDBDatasource, InfluxDBSpec } from '../datasource/influxdb/InfluxDBDatasource';

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

  it('should create initial options with version and database', () => {
    const initialOptions = InfluxDBDatasource.createInitialOptions();
    expect(initialOptions).toEqual({
      version: 'v1',
      database: '',
    });
  });

  it('should throw error when no URL is provided', () => {
    const spec: InfluxDBSpec = {
      version: 'v1',
      database: 'testdb',
    };
    const options = {
      proxyUrl: undefined,
    };

    expect(() => {
      InfluxDBDatasource.createClient(spec, options);
    }).toThrow('No URL specified for InfluxDB client');
  });

  it('should use directUrl when provided', () => {
    const spec: InfluxDBSpec = {
      version: 'v1',
      database: 'testdb',
      directUrl: 'http://localhost:8086',
    };
    const options = {
      proxyUrl: 'http://proxy:8086',
    };

    const client = InfluxDBDatasource.createClient(spec, options);
    expect(client.options.datasourceUrl).toBe('http://localhost:8086');
  });

  it('should fall back to proxyUrl when directUrl is not provided', () => {
    const spec: InfluxDBSpec = {
      version: 'v1',
      database: 'testdb',
    };
    const options = {
      proxyUrl: 'http://proxy:8086',
    };

    const client = InfluxDBDatasource.createClient(spec, options);
    expect(client.options.datasourceUrl).toBe('http://proxy:8086');
  });
});
