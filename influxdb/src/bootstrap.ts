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

// Re-export plugin module metadata
export { getPluginModule } from './getPluginModule';

// Re-export the unified datasource for both V1 and V3
export { InfluxDBDatasource } from './datasource/influxdb/InfluxDBDatasource';

// Re-export the query with proper name for module federation
export { InfluxDBTimeSeriesQuery } from './queries/influxdb-time-series-query/InfluxDBTimeSeriesQuery';

// Re-export the explore plugin
export { InfluxDBExplorer } from './explore/InfluxDBExplorer';
