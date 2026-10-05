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
import { TimeSeries } from '@perses-dev/core';
import { InfluxDBClient, InfluxDBV1Response } from '../../datasources/influxdb-datasource/influxdb-datasource-types';
import { replaceInfluxDBBuiltinVariables } from '../../model/replace-influxdb-builtin-variables';
import { InfluxDBTimeSeriesQuerySpec } from './influxdb-time-series-query-types';
import { InfluxDBTimeSeriesQueryEditor } from './InfluxDBTimeSeriesQueryEditor';

function convertV1ResponseToTimeSeries(response: InfluxDBV1Response): TimeSeries[] {
  const series: TimeSeries[] = [];
  const firstResult = response.results[0];
  if (!firstResult?.series) return series;

  for (const seriesData of firstResult.series) {
    const timeIndex = seriesData.columns.indexOf('time');
    if (timeIndex === -1) continue;
    const valueColumns = seriesData.columns.filter((col) => col !== 'time');

    for (const valueColumn of valueColumns) {
      const valueIndex = seriesData.columns.indexOf(valueColumn);
      const values = seriesData.values.map((row) => [
        new Date(row[timeIndex] as string | number).getTime(),
        row[valueIndex],
      ]) as Array<[number, number | null]>;

      const tagStr = seriesData.tags
        ? Object.entries(seriesData.tags)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',')
        : '';

      series.push({
        name: `${seriesData.name}.${valueColumn}`,
        values,
        formattedName: tagStr ? `${seriesData.name}{${tagStr}}.${valueColumn}` : `${seriesData.name}.${valueColumn}`,
      });
    }
  }

  return series;
}

/**
 * Parse InfluxDB v3 CSV/Annotated-CSV response into TimeSeries[].
 *
 * The response is annotated CSV with three header rows:
 *   #datatype,#group,#default   — followed by column names, then data rows.
 * Each table section is separated by an empty line.
 * The "_time" column holds RFC3339 timestamps; "_value" holds the metric value.
 * The "_measurement" and tag columns form the series labels.
 */
function convertV3AnnotatedCsvToTimeSeries(csv: string): TimeSeries[] {
  const seriesMap = new Map<string, TimeSeries>();

  // Split into tables separated by blank lines
  const tables = csv.split(/\n\n+/).filter(Boolean);

  for (const table of tables) {
    const lines = table.split('\n').filter(Boolean);
    // Skip annotation rows (#datatype, #group, #default) and find the header row
    const headerLine = lines.find((l) => !l.startsWith('#'));
    if (!headerLine) continue;

    const headers = headerLine.split(',');
    const timeIdx = headers.indexOf('_time');
    const valueIdx = headers.indexOf('_value');
    const measurementIdx = headers.indexOf('_measurement');
    const fieldIdx = headers.indexOf('_field');

    if (timeIdx === -1 || valueIdx === -1) continue;

    const dataLines = lines.slice(lines.indexOf(headerLine) + 1);
    for (const line of dataLines) {
      if (!line || line.startsWith('#')) continue;
      const cells = line.split(',');

      const timeMs = new Date(cells[timeIdx] ?? '').getTime();
      if (isNaN(timeMs)) continue;
      const rawValue = cells[valueIdx];
      const value = rawValue !== undefined && rawValue !== '' ? parseFloat(rawValue) : null;

      const measurement = measurementIdx !== -1 ? (cells[measurementIdx] ?? '') : '';
      const field = fieldIdx !== -1 ? (cells[fieldIdx] ?? '') : '';
      const seriesName = field ? `${measurement}.${field}` : measurement;

      if (!seriesMap.has(seriesName)) {
        seriesMap.set(seriesName, { name: seriesName, values: [] });
      }
      seriesMap.get(seriesName)!.values.push([timeMs, value === null || isNaN(value) ? null : value]);
    }
  }

  return Array.from(seriesMap.values());
}

const DEFAULT_STEP_MS = 30_000;

export const InfluxDBTimeSeriesQuery: TimeSeriesQueryPlugin<InfluxDBTimeSeriesQuerySpec> = {
  getTimeSeriesData: async (spec, context) => {
    if (!spec.query) {
      return { series: [], timeRange: context.timeRange, stepMs: DEFAULT_STEP_MS };
    }

    const query = replaceInfluxDBBuiltinVariables(
      replaceVariables(spec.query, context.variableState),
      context.timeRange,
      DEFAULT_STEP_MS
    );

    const client = (await context.datasourceStore.getDatasourceClient(
      spec.datasource ?? { kind: 'InfluxDBDatasource' }
    )) as InfluxDBClient;

    if (!client) {
      throw new Error('No datasource client available');
    }

    const { start, end } = context.timeRange;
    let timeSeries: TimeSeries[] = [];

    const lang = spec.queryLanguage;

    if (typeof client.queryV1 === 'function' && lang !== 'sql' && lang !== 'flux') {
      // Database defaults to the spec-configured value on the datasource client side
      const response = await client.queryV1(query, '');
      timeSeries = convertV1ResponseToTimeSeries(response);
    } else if (typeof client.queryV3Flux === 'function' && lang === 'flux') {
      const response = await client.queryV3Flux(query);
      if (typeof response.data === 'string') {
        timeSeries = convertV3AnnotatedCsvToTimeSeries(response.data);
      }
    } else if (typeof client.queryV3SQL === 'function') {
      const response = await client.queryV3SQL(query);
      if (typeof response.data === 'string') {
        timeSeries = convertV3AnnotatedCsvToTimeSeries(response.data);
      }
    } else {
      throw new Error('Datasource client has no recognized query method (queryV1, queryV3SQL, queryV3Flux)');
    }

    return {
      series: timeSeries,
      timeRange: { start, end },
      stepMs: DEFAULT_STEP_MS,
      metadata: { executedQueryString: query },
    };
  },
  OptionsEditorComponent: InfluxDBTimeSeriesQueryEditor,
  createInitialOptions: () => ({ query: '', queryLanguage: 'influxql' as const }),
};

export default InfluxDBTimeSeriesQuery;
