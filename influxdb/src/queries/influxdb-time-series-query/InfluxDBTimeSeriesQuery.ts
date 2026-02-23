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
import { TimeSeriesQueryPlugin, replaceVariables } from '@perses-dev/plugin-system';
import { TimeSeriesData, TimeSeries, DatasourceSelector } from '@perses-dev/core';
import { InfluxDBTimeSeriesQueryEditor } from './InfluxDBTimeSeriesQueryEditor';
export interface InfluxDBTimeSeriesQuerySpec {
  datasource?: DatasourceSelector;
  query: string;
}
function convertV1ResponseToTimeSeries(response: any): TimeSeries[] {
  const series: TimeSeries[] = [];
  if (response.results && response.results[0] && response.results[0].series) {
    response.results[0].series.forEach((seriesData: any) => {
      const timeIndex = seriesData.columns.indexOf('time');
      const valueColumns = seriesData.columns.filter((col: string) => col !== 'time');
      valueColumns.forEach((valueColumn: string) => {
        const valueIndex = seriesData.columns.indexOf(valueColumn);
        const values = seriesData.values.map((row: any[]) => [new Date(row[timeIndex]).getTime(), row[valueIndex]]);
        const tagStr = seriesData.tags
          ? Object.entries(seriesData.tags)
              .map(([k, v]) => k + '="' + v + '"')
              .join(',')
          : '';
        series.push({
          name: seriesData.name + '.' + valueColumn,
          values: values as Array<[number, number | null]>,
          formattedName: tagStr
            ? seriesData.name + '{' + tagStr + '}.' + valueColumn
            : seriesData.name + '.' + valueColumn,
        });
      });
    });
  }
  return series;
}
function convertV3ResponseToTimeSeries(response: any): TimeSeries[] {
  const series: TimeSeries[] = [];
  // TODO: Implement V3 response conversion
  // V3 CSV/Flux response format
  return series;
}
export const InfluxDBTimeSeriesQuery: TimeSeriesQueryPlugin<InfluxDBTimeSeriesQuerySpec> = {
  getTimeSeriesData: async (spec: InfluxDBTimeSeriesQuerySpec, context: any) => {
    // Return empty if query is empty
    if (!spec.query) {
      return {
        series: [],
        timeRange: context.timeRange,
        stepMs: 30 * 1000,
        metadata: {
          executedQueryString: '',
        },
      } as TimeSeriesData;
    }
    // Replace variables in query
    const query = replaceVariables(spec.query, context.variableState);
    try {
      // Get datasource client from store
      const client = await context.datasourceStore.getDatasourceClient(
        spec.datasource ?? { kind: 'InfluxDBDatasource' }
      );
      if (!client) {
        throw new Error('No datasource client available');
      }
      // Get time range
      const { start, end } = context.timeRange;
      let response: any;
      let datasourceSpec: any;
      // Try to get datasource spec to determine version
      try {
        datasourceSpec = await context.datasourceStore.getDatasourceSpec?.(
          spec.datasource ?? { kind: 'InfluxDBDatasource' }
        );
      } catch (e) {
        // Spec not available, we'll try to detect from client methods
      }
      // Determine version and call appropriate query method
      if (typeof client.queryV1 === 'function') {
        // V1 Query
        const database = datasourceSpec?.database || '';
        response = await client.queryV1(query, database);
      } else if (typeof client.queryV3SQL === 'function') {
        // V3 SQL Query
        response = await client.queryV3SQL(query);
      } else if (typeof client.queryV3Flux === 'function') {
        // V3 Flux Query (fallback)
        response = await client.queryV3Flux(query);
      } else {
        throw new Error(
          'Datasource client has no query methods (queryV1, queryV3SQL, or queryV3Flux)'
        );
      }
      // Convert response to timeseries
      let timeSeries: TimeSeries[] = [];
      if (response) {
        // Auto-detect V1 vs V3 based on response structure
        if (response.results) {
          // V1 response format
          timeSeries = convertV1ResponseToTimeSeries(response);
        } else if (response.data) {
          // V3 response format
          timeSeries = convertV3ResponseToTimeSeries(response);
        }
      }
      return {
        series: timeSeries,
        timeRange: { start, end },
        stepMs: 30 * 1000,
        metadata: {
          executedQueryString: query,
        },
      } as TimeSeriesData;
    } catch (error) {
      console.error('Error executing InfluxDB query:', error);
      throw error;
    }
  },
  OptionsEditorComponent: InfluxDBTimeSeriesQueryEditor,
  createInitialOptions: () => ({ query: '' }),
};
// Default export for Module Federation
export default InfluxDBTimeSeriesQuery;
