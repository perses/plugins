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
import { TimeSeriesData, TimeSeries, DatasourceSelector, AbsoluteTimeRange } from '@perses-dev/core';
import { InfluxDBTimeSeriesQueryEditor } from './InfluxDBTimeSeriesQueryEditor';
export interface InfluxDBTimeSeriesQuerySpec {
  datasource?: DatasourceSelector;
  query: string;
}
interface InfluxDBV1SeriesData {
  name: string;
  columns: string[];
  values: Array<Array<string | number | null>>;
  tags?: Record<string, string>;
}

interface InfluxDBV1ResponseData {
  results: Array<{
    series?: InfluxDBV1SeriesData[];
  }>;
}

function convertV1ResponseToTimeSeries(response: InfluxDBV1ResponseData): TimeSeries[] {
  const series: TimeSeries[] = [];
  if (response.results && response.results[0] && response.results[0].series) {
    response.results[0].series.forEach((seriesData: InfluxDBV1SeriesData) => {
      const timeIndex = seriesData.columns.indexOf('time');
      const valueColumns = seriesData.columns.filter((col: string) => col !== 'time');
      valueColumns.forEach((valueColumn: string) => {
        const valueIndex = seriesData.columns.indexOf(valueColumn);
        const values = seriesData.values.map((row: Array<string | number | null>) => [
          new Date(row[timeIndex] as string | number).getTime(),
          row[valueIndex],
        ]);
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
function convertV3ResponseToTimeSeries(_response: Record<string, unknown>): TimeSeries[] {
  const series: TimeSeries[] = [];
  // TODO: Implement V3 response conversion
  // V3 CSV/Flux response format
  return series;
}
interface InfluxDBClient {
  queryV1?: (query: string, database: string) => Promise<InfluxDBV1ResponseData>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryV3SQL?: (query: string) => Promise<Record<string, any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryV3Flux?: (query: string) => Promise<Record<string, any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface QueryContext {
  timeRange: AbsoluteTimeRange;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variableState: Record<string, any>;
  datasourceStore: {
    getDatasourceClient: (selector: DatasourceSelector) => Promise<InfluxDBClient>;
    getDatasourceSpec?: (selector: DatasourceSelector) => Promise<Record<string, unknown>>;
  };
}

export const InfluxDBTimeSeriesQuery: TimeSeriesQueryPlugin<InfluxDBTimeSeriesQuerySpec> = {
  getTimeSeriesData: async (spec: InfluxDBTimeSeriesQuerySpec, context: QueryContext) => {
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
      // Get the datasource client from the store
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = (await context.datasourceStore.getDatasourceClient(
        spec.datasource ?? { kind: 'InfluxDBDatasource' }
      )) as InfluxDBClient;
      if (!client) {
        throw new Error('No datasource client available');
      }
      // Get time range
      const { start, end } = context.timeRange;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let clientResponse: InfluxDBV1ResponseData | Record<string, any>;
      let datasourceSpec: Record<string, unknown> | undefined;
      // Try to get datasource spec to determine a version
      try {
        datasourceSpec = await context.datasourceStore.getDatasourceSpec?.(
          spec.datasource ?? { kind: 'InfluxDBDatasource' }
        );
      } catch {
        // Spec not available, we'll try to detect from client methods
      }
      // Determine version and call the appropriate query method
      if (typeof client.queryV1 === 'function') {
        // V1 Query
        const database = datasourceSpec?.database || '';
        clientResponse = await client.queryV1(query, database as string);
      } else if (typeof client.queryV3SQL === 'function') {
        // V3 SQL Query
        clientResponse = await client.queryV3SQL(query);
      } else if (typeof client.queryV3Flux === 'function') {
        // V3 Flux Query (fallback)
        clientResponse = await client.queryV3Flux(query);
      } else {
        throw new Error('Datasource client has no query methods (queryV1, queryV3SQL, or queryV3Flux)');
      }
      // Convert response to timeseries
      let timeSeries: TimeSeries[] = [];
      if (clientResponse) {
        // Auto-detect V1 vs V3 based on response structure
        if ('results' in clientResponse) {
          // V1 response format
          timeSeries = convertV1ResponseToTimeSeries(clientResponse as InfluxDBV1ResponseData);
        } else if ('data' in clientResponse) {
          // V3 response format
          timeSeries = convertV3ResponseToTimeSeries(clientResponse);
        }
      }
      return {
        series: timeSeries,
        timeRange: { start, end } as AbsoluteTimeRange,
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
