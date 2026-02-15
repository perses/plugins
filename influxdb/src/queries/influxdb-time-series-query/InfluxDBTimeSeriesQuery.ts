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
import { TimeSeriesData, TimeSeries } from '@perses-dev/core';
import { InfluxDBTimeSeriesQueryEditor } from './InfluxDBTimeSeriesQueryEditor';
export interface InfluxDBTimeSeriesQuerySpec {
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
  if (response.data && response.schema) {
    const timeField = response.schema.fields.find((f: any) => f.data_type === 'Timestamp');
    const timeIndex = response.schema.fields.indexOf(timeField);
    response.schema.fields.forEach((field: any, index: number) => {
      if (field.data_type !== 'Timestamp' && field.data_type !== 'Utf8') {
        const values = response.data.map((row: any[]) => [new Date(row[timeIndex]).getTime(), row[index]]);
        series.push({
          name: field.name,
          values: values as Array<[number, number | null]>,
          formattedName: field.name,
        });
      }
    });
  }
  return series;
}
export const InfluxDBTimeSeriesQuery: TimeSeriesQueryPlugin<InfluxDBTimeSeriesQuerySpec> = {
  getTimeSeriesData: async (spec: InfluxDBTimeSeriesQuerySpec, context: any) => {
    const { query } = spec;
    const { datasourceClient, datasourceSpec } = context;
    if (!datasourceClient) {
      throw new Error('No datasource client available');
    }
    let timeSeries: TimeSeries[] = [];
    if (datasourceSpec.version === 'v1') {
      const response = await datasourceClient.queryV1(query, datasourceSpec.database);
      timeSeries = convertV1ResponseToTimeSeries(response);
    } else if (datasourceSpec.version === 'v3') {
      const response = await datasourceClient.queryV3SQL(query, datasourceSpec.organization, datasourceSpec.bucket);
      timeSeries = convertV3ResponseToTimeSeries(response);
    } else {
      throw new Error('Unsupported InfluxDB version: ' + (datasourceSpec as any).version);
    }

    return {
      series: timeSeries,
      timeRange: context.timeRange,
      stepMs: 30 * 1000,
      metadata: {
        executedQueryString: query,
      },
    } as TimeSeriesData;
  },
  OptionsEditorComponent: InfluxDBTimeSeriesQueryEditor,
  createInitialOptions: () => ({ query: '' }),
};
