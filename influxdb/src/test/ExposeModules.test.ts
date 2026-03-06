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

import * as InfluxDBDatasourceModule from '../datasource/influxdb/InfluxDBDatasource';
import * as InfluxDBTimeSeriesQueryModule from '../queries/influxdb-time-series-query/InfluxDBTimeSeriesQuery';

describe('Module Federation Expose Modules', () => {
  describe('InfluxDBDatasource.ts', () => {
    it('should export default InfluxDBDatasource', () => {
      expect(InfluxDBDatasourceModule.default).toBeDefined();
      expect(InfluxDBDatasourceModule.default).toHaveProperty('createClient');
    });

    it('should have all required datasource properties', () => {
      const datasource = InfluxDBDatasourceModule.default;
      expect(datasource).toHaveProperty('createClient');
      expect(datasource).toHaveProperty('createInitialOptions');
      expect(datasource).toHaveProperty('OptionsEditorComponent');
    });
  });

  describe('influxdb-time-series-query.ts', () => {
    it('should export default InfluxDBTimeSeriesQuery', () => {
      expect(InfluxDBTimeSeriesQueryModule.default).toBeDefined();
      expect(InfluxDBTimeSeriesQueryModule.default).toHaveProperty('getTimeSeriesData');
    });

    it('should have all required query properties', () => {
      const query = InfluxDBTimeSeriesQueryModule.default;
      expect(query).toHaveProperty('getTimeSeriesData');
      expect(query).toHaveProperty('createInitialOptions');
      expect(query).toHaveProperty('OptionsEditorComponent');
    });
  });
});
