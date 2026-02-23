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

import { InfluxDBV1Datasource } from '../datasource/influxdb-v1/InfluxDBV1Datasource';

describe('InfluxDBDatasource', () => {
  it('should have createClient method', () => {
    expect(InfluxDBV1Datasource).toHaveProperty('createClient');
    expect(typeof InfluxDBV1Datasource.createClient).toBe('function');
  });

  it('should have OptionsEditorComponent', () => {
    expect(InfluxDBV1Datasource).toHaveProperty('OptionsEditorComponent');
  });

  it('should have createInitialOptions method', () => {
    expect(InfluxDBV1Datasource).toHaveProperty('createInitialOptions');
    expect(typeof InfluxDBV1Datasource.createInitialOptions).toBe('function');
  });

  it('should create initial options with database', () => {
    const initialOptions = InfluxDBV1Datasource.createInitialOptions();
    expect(initialOptions).toEqual({
      database: '',
    });
  });

  it('should throw error when no URL is provided', () => {
    const spec = {
      directUrl: undefined,
    };
    const options = {
      proxyUrl: undefined,
    };

    expect(() => {
      InfluxDBV1Datasource.createClient(spec, options);
    }).toThrow('No URL specified for InfluxDB v1 client');
  });

  it('should use directUrl when provided', () => {
    const spec = {
      directUrl: 'http://localhost:8086',
    };
    const options = {
      proxyUrl: 'http://proxy:8086',
    };

    const client = InfluxDBV1Datasource.createClient(spec, options);
    expect(client.options.datasourceUrl).toBe('http://localhost:8086');
  });

  it('should fall back to proxyUrl when directUrl is not provided', () => {
    const spec = {
      directUrl: undefined,
    };
    const options = {
      proxyUrl: 'http://proxy:8086',
    };

    const client = InfluxDBV1Datasource.createClient(spec, options);
    expect(client.options.datasourceUrl).toBe('http://proxy:8086');
  });

});

