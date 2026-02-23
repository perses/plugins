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

import { getPluginModule } from '../getPluginModule';
import packageJson from '../../package.json';

describe('InfluxDB Plugin Integration', () => {
  describe('Plugin Module Resource', () => {
    it('should return valid PluginModuleResource', () => {
      const pluginModule = getPluginModule();
      expect(pluginModule.kind).toBe('PluginModule');
    });

    it('should have correct metadata from package.json', () => {
      const pluginModule = getPluginModule();
      expect(pluginModule.metadata.name).toBe(packageJson.name);
      expect(pluginModule.metadata.version).toBe(packageJson.version);
    });

    it('should include all plugins from package.json perses config', () => {
      const pluginModule = getPluginModule();
      const expectedPlugins = packageJson.perses.plugins;
      expect(pluginModule.spec.plugins).toEqual(expectedPlugins);
    });

    it('should have correct plugin kinds', () => {
      const pluginModule = getPluginModule();
      const pluginKinds = pluginModule.spec.plugins.map((p: any) => p.kind);
      expect(pluginKinds).toContain('Datasource');
      expect(pluginKinds).toContain('TimeSeriesQuery');
    });

    it('should have correct plugin names', () => {
      const pluginModule = getPluginModule();
      const pluginNames = pluginModule.spec.plugins.map((p: any) => p.spec.name);
      expect(pluginNames).toContain('InfluxDBDatasource');
      expect(pluginNames).toContain('InfluxDBTimeSeriesQuery');
    });
  });

  describe('Plugin Metadata', () => {
    it('should have display names for all plugins', () => {
      const pluginModule = getPluginModule();
      pluginModule.spec.plugins.forEach((plugin: any) => {
        expect(plugin.spec.display).toBeDefined();
        expect(plugin.spec.display.name).toBeDefined();
        expect(plugin.spec.display.name).toBeTruthy();
      });
    });

    it('should have valid plugin specifications', () => {
      const pluginModule = getPluginModule();
      pluginModule.spec.plugins.forEach((plugin: any) => {
        expect(plugin.kind).toBeTruthy();
        expect(plugin.spec).toBeDefined();
        expect(plugin.spec.name).toBeDefined();
      });
    });
  });

  describe('Datasource Plugin Configuration', () => {
    it('should have InfluxDB Datasource configured', () => {
      const pluginModule = getPluginModule();
      const datasourcePlugin = pluginModule.spec.plugins.find(
        (p: any) => p.kind === 'Datasource' && p.spec.name === 'InfluxDBDatasource'
      );
      expect(datasourcePlugin).toBeDefined();
    });

    it('should have correct Datasource display name', () => {
      const pluginModule = getPluginModule();
      const datasourcePlugin = pluginModule.spec.plugins.find(
        (p: any) => p.kind === 'Datasource' && p.spec.name === 'InfluxDBDatasource'
      );
      expect(datasourcePlugin.spec.display.name).toBe('InfluxDB Datasource');
    });
  });

  describe('TimeSeriesQuery Plugin Configuration', () => {
    it('should have TimeSeriesQuery plugin configured', () => {
      const pluginModule = getPluginModule();
      const queryPlugin = pluginModule.spec.plugins.find(
        (p: any) => p.kind === 'TimeSeriesQuery' && p.spec.name === 'InfluxDBTimeSeriesQuery'
      );
      expect(queryPlugin).toBeDefined();
    });

    it('should have correct TimeSeriesQuery display name', () => {
      const pluginModule = getPluginModule();
      const queryPlugin = pluginModule.spec.plugins.find(
        (p: any) => p.kind === 'TimeSeriesQuery' && p.spec.name === 'InfluxDBTimeSeriesQuery'
      );
      expect(queryPlugin.spec.display.name).toBe('InfluxDB Time Series Query');
    });
  });
});

