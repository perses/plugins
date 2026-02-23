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

import * as InfluxDBDatasourceModule from '../datasource/influxdb-v1/InfluxDBV1Datasource';
import * as InfluxDBTimeSeriesQueryModule from '../queries/influxdb-time-series-query/InfluxDBTimeSeriesQuery';

describe('Module Federation Exports', () => {
  describe('InfluxDBV1Datasource Module', () => {
    it('should export default InfluxDBV1Datasource', () => {
      expect(InfluxDBDatasourceModule.default).toBeDefined();
      expect(InfluxDBDatasourceModule.default).toHaveProperty('createClient');
    });

    it('should export named InfluxDBV1Datasource', () => {
      expect(InfluxDBDatasourceModule.InfluxDBV1Datasource).toBeDefined();
      expect(InfluxDBDatasourceModule.InfluxDBV1Datasource).toEqual(InfluxDBDatasourceModule.default);
    });

    it('should have all required datasource plugin properties', () => {
      const datasource = InfluxDBDatasourceModule.default;
      expect(datasource).toHaveProperty('createClient');
      expect(datasource).toHaveProperty('createInitialOptions');
      expect(datasource).toHaveProperty('OptionsEditorComponent');
    });
  });

  describe('InfluxDBTimeSeriesQuery Module', () => {
    it('should export default InfluxDBTimeSeriesQuery', () => {
      expect(InfluxDBTimeSeriesQueryModule.default).toBeDefined();
      expect(InfluxDBTimeSeriesQueryModule.default).toHaveProperty('getTimeSeriesData');
    });

    it('should export named InfluxDBTimeSeriesQuery', () => {
      expect(InfluxDBTimeSeriesQueryModule.InfluxDBTimeSeriesQuery).toBeDefined();
      expect(InfluxDBTimeSeriesQueryModule.InfluxDBTimeSeriesQuery).toEqual(InfluxDBTimeSeriesQueryModule.default);
    });

    it('should have all required query plugin properties', () => {
      const query = InfluxDBTimeSeriesQueryModule.default;
      expect(query).toHaveProperty('getTimeSeriesData');
      expect(query).toHaveProperty('createInitialOptions');
      expect(query).toHaveProperty('OptionsEditorComponent');
    });
  });

  describe('Bootstrap Module', () => {
    it('should export all required modules from bootstrap', async () => {
      const bootstrap = await import('../bootstrap');
      expect(bootstrap.getPluginModule).toBeDefined();
      expect(bootstrap.InfluxDBDatasource).toBeDefined();
      expect(bootstrap.InfluxDBTimeSeriesQuery).toBeDefined();
    });

    it('should export correct InfluxDBDatasource from bootstrap', async () => {
      const bootstrap = await import('../bootstrap');
      const datasource = bootstrap.InfluxDBDatasource;
      expect(datasource).toHaveProperty('createClient');
      expect(datasource).toHaveProperty('createInitialOptions');
      expect(datasource).toHaveProperty('OptionsEditorComponent');
    });

    it('should export correct InfluxDBTimeSeriesQuery from bootstrap', async () => {
      const bootstrap = await import('../bootstrap');
      expect(bootstrap.InfluxDBTimeSeriesQuery).toEqual(InfluxDBTimeSeriesQueryModule.InfluxDBTimeSeriesQuery);
    });

    it('should return valid PluginModule metadata', async () => {
      const bootstrap = await import('../bootstrap');
      const pluginModule = bootstrap.getPluginModule();
      expect(pluginModule.kind).toBe('PluginModule');
      expect(pluginModule.metadata).toHaveProperty('name');
      expect(pluginModule.metadata).toHaveProperty('version');
      expect(pluginModule.spec).toHaveProperty('plugins');
    });
  });
});

