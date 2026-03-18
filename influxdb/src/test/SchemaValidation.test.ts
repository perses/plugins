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

import * as fs from 'fs';
import * as path from 'path';

interface PluginSpec {
  kind: string;
  spec: {
    name: string;
    display: {
      name: string;
    };
  };
}

describe('Plugin Schema Validation', () => {
  describe('Datasource CUE Schema', () => {
    it('should have correct CUE schema file', () => {
      const schemaPath = path.join(__dirname, '../../schemas/datasource/influxdb.cue');
      expect(fs.existsSync(schemaPath)).toBe(true);
    });

    it('should contain #kind definition', () => {
      const schemaPath = path.join(__dirname, '../../schemas/datasource/influxdb.cue');
      const content = fs.readFileSync(schemaPath, 'utf-8');
      expect(content).toContain('#kind: "InfluxDBDatasource"');
    });

    it('should contain kind assignment', () => {
      const schemaPath = path.join(__dirname, '../../schemas/datasource/influxdb.cue');
      const content = fs.readFileSync(schemaPath, 'utf-8');
      expect(content).toContain('kind: #kind');
    });

    it('should contain #selector definition', () => {
      const schemaPath = path.join(__dirname, '../../schemas/datasource/influxdb.cue');
      const content = fs.readFileSync(schemaPath, 'utf-8');
      expect(content).toContain('#selector');
      expect(content).toContain('common.#datasourceSelector');
      expect(content).toContain('_kind: #kind');
    });

    it('should have valid unified v1 and v3 configuration', () => {
      const schemaPath = path.join(__dirname, '../../schemas/datasource/influxdb.cue');
      const content = fs.readFileSync(schemaPath, 'utf-8');
      // Version selector
      expect(content).toContain('version:');
      // Connection type (proxy or direct)
      expect(content).toContain('#directUrl');
      expect(content).toContain('#proxy');
      // Auth via secret reference
      expect(content).toContain('auth?: string');
      // V1 specific fields
      expect(content).toContain('database?: string');
      // V3 specific fields
      expect(content).toContain('organization?: string');
      expect(content).toContain('bucket?: string');
      // Import common proxy patterns
      expect(content).toContain('commonProxy');
    });
  });

  describe('Plugin Registration', () => {
    it('should have InfluxDBDatasource in package.json', () => {
      const packageJsonPath = path.join(__dirname, '../../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      expect(packageJson.perses).toBeDefined();
      expect(packageJson.perses.plugins).toBeDefined();

      const datasourcePlugin = packageJson.perses.plugins.find(
        (p: PluginSpec) => p.kind === 'Datasource' && p.spec.name === 'InfluxDBDatasource'
      );
      expect(datasourcePlugin).toBeDefined();
    });

    it('should have InfluxDBTimeSeriesQuery in package.json', () => {
      const packageJsonPath = path.join(__dirname, '../../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

      const queryPlugin = packageJson.perses.plugins.find(
        (p: PluginSpec) => p.kind === 'TimeSeriesQuery' && p.spec.name === 'InfluxDBTimeSeriesQuery'
      );
      expect(queryPlugin).toBeDefined();
    });
  });

  describe('Plugin Module Files', () => {
    it('InfluxDBDatasource.ts should have valid TypeScript', () => {
      const datasourcePath = path.join(__dirname, '../datasource/influxdb/InfluxDBDatasource.ts');
      const content = fs.readFileSync(datasourcePath, 'utf-8');
      expect(content).toContain('export const InfluxDBDatasource');
      expect(content).toContain('version');
      expect(content).toContain('queryV1');
      expect(content).toContain('queryV3SQL');
      expect(content).toContain('createClient');
    });

    it('InfluxDBTimeSeriesQuery.ts should have valid TypeScript', () => {
      const queryPath = path.join(__dirname, '../queries/influxdb-time-series-query/InfluxDBTimeSeriesQuery.ts');
      const content = fs.readFileSync(queryPath, 'utf-8');
      expect(content).toContain('export const InfluxDBTimeSeriesQuery');
      expect(content).toContain('export default InfluxDBTimeSeriesQuery');
      expect(content).toContain('getTimeSeriesData');
      expect(content).toContain('OptionsEditorComponent');
    });
  });
});
