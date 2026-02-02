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
import { TimeSeriesQueryPlugin } from '@perses-dev/plugin-system';
import { TimeSeriesData } from '@perses-dev/core';
import { InfluxDBDatasourceSpec, InfluxDBClient } from '../../model';
import { InfluxDBTimeSeriesQueryEditor } from './InfluxDBTimeSeriesQueryEditor';
export interface InfluxDBTimeSeriesQuerySpec {
  query: string;
}
function convertV1ResponseToTimeSeries(response: any): TimeSeriesData {
  const datasets: any[] = [];
  if (response.results && response.results[0] && response.results[0].series) {
    response.results[0].series.forEach((series: any) => {
      const timeIndex = series.columns.indexOf('time');
      const valueColumns = series.columns.filter((col: string) => col !== 'time');
      valueColumns.forEach((valueColumn: string) => {
        const valueIndex = series.columns.indexOf(valueColumn);
        const data = series.values.map((row: any[]) => ({
          x: new Date(row[timeIndex]).getTime(),
          y: row[valueIndex],
        }));
        const tagStr = series.tags
          ? Object.entries(series.tags).map(([k, v]) => k + '="' + v + '"').join(',')
          : '';
        datasets.push({
          name: series.name + '.' + valueColumn,
          values: data,
          formattedName: tagStr
            ? series.name + '{' + tagStr + '}.' + valueColumn
            : series.name + '.' + valueColumn,
        });
      });
    });
  }
  return { datasets };
}
function convertV3ResponseToTimeSeries(response: any): TimeSeriesData {
  const datasets: any[] = [];
  if (response.data && response.schema) {
    const timeField = response.schema.fields.find((f: any) => f.data_type === 'Timestamp');
    const timeIndex = response.schema.fields.indexOf(timeField);
    response.schema.fields.forEach((field: any, index: number) => {
      if (field.data_type !== 'Timestamp' && field.data_type !== 'Utf8') {
        const data = response.data.map((row: any[]) => ({
          x: new Date(row[timeIndex]).getTime(),
          y: row[index],
        }));
        datasets.push({ name: field.name, values: data, formattedName: field.name });
      }
    });
  }
  return { datasets };
}
export const InfluxDBTimeSeriesQuery: TimeSeriesQueryPlugin<
  InfluxDBTimeSeriesQuerySpec,
  InfluxDBDatasourceSpec,
  InfluxDBClient
> = {
  getTimeSeriesData: async (spec, context) => {
    const { query } = spec;
    const { datasourceClient, datasourceSpec } = context;
    if (!datasourceClient) {
      throw new Error('No datasource client available');
    }
    if (datasourceSpec.version === 'v1') {
      const response = await datasourceClient.queryV1(query, datasourceSpec.database);
      return convertV1ResponseToTimeSeries(response);
    } else if (datasourceSpec.version === 'v3') {
      const response = await datasourceClient.queryV3SQL(query, datasourceSpec.organization, datasourceSpec.bucket);
      return convertV3ResponseToTimeSeries(response);
    }
    throw new Error('Unsupported InfluxDB version: ' + (datasourceSpec as any).version);
  },
  OptionsEditorComponent: InfluxDBTimeSeriesQueryEditor,
};
