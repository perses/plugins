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

import { TimeSeriesQueryPlugin, replaceVariables, parseVariables } from '@perses-dev/plugin-system';
import { TimeSeries } from '@perses-dev/spec';
import { SQLDatasourceClient } from '../../datasources/sql-datasource/sql-datasource-types';
import { replaceSQLBuiltinVariables } from '../../model/replace-sql-builtin-variables';
import { SQLTimeSeriesQuerySpec } from './sql-time-series-query-types';
import { SQLTimeSeriesQueryEditor } from './SQLTimeSeriesQueryEditor';

const getTimeSeriesData: TimeSeriesQueryPlugin<SQLTimeSeriesQuerySpec>['getTimeSeriesData'] = async (
  spec,
  context,
  abortSignal
) => {
  if (!spec.query) {
    return { series: [] };
  }

  const datasourceSelector = spec.datasource || { kind: 'SQLDatasource' };

  const datasourceClient = await context.datasourceStore.getDatasourceClient<SQLDatasourceClient>(datasourceSelector);

  if (!datasourceClient) {
    throw new Error('No datasource configured for SQL query. Please select a SQL datasource.');
  }

  const { datasourceUrl } = datasourceClient.options;

  if (!datasourceUrl) {
    throw new Error('No datasource URL available. Ensure the SQL datasource is properly configured.');
  }

  const rangeDuration = (context.timeRange.end.getTime() - context.timeRange.start.getTime()) / 1000;
  const interval = spec.minStep || Math.max(1, Math.floor(rangeDuration / 1000));
  const intervalMs = interval * 1000;

  const queryWithVariables = replaceVariables(spec.query, context.variableState);
  const timeFormat = spec.timeFormat === 'unix' || spec.timeFormat === 'unix_ms' ? spec.timeFormat : 'iso8601';
  const processedQuery = replaceSQLBuiltinVariables(queryWithVariables, context.timeRange, intervalMs, timeFormat);

  const response = await fetch(datasourceUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: processedQuery,
    }),
    signal: abortSignal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SQL query failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result: { columns: Array<{ name: string; type: string }>; rows: Array<Record<string, unknown>> } =
    await response.json();

  const series = transformToTimeSeries(result, spec);

  // Detect actual step from the data if we have enough points; otherwise fall back to computed interval.
  const detectedStepMs = detectStepMs(series, intervalMs);

  return {
    series,
    timeRange: context.timeRange,
    stepMs: detectedStepMs,
  };
};

function detectStepMs(series: TimeSeries[], fallbackMs: number): number {
  for (const s of series) {
    if (s.values.length >= 2) {
      return (s.values[1] as [number, number | null])[0] - (s.values[0] as [number, number | null])[0];
    }
  }
  return fallbackMs;
}

function transformToTimeSeries(
  result: { columns: Array<{ name: string; type: string }>; rows: Array<Record<string, unknown>> },
  spec: SQLTimeSeriesQuerySpec
): TimeSeries[] {
  const { columns, rows } = result;

  if (!rows || rows.length === 0) {
    return [];
  }

  const timeColumn = spec.timeColumn || detectTimeColumn(columns);
  if (!timeColumn) {
    throw new Error('No time column found in query result');
  }

  const labelColumns = spec.labelColumns || [];
  const valueColumns =
    spec.valueColumns ||
    columns.map((col) => col.name).filter((name) => name !== timeColumn && !labelColumns.includes(name));

  const seriesMap = new Map<string, TimeSeries>();

  for (const row of rows) {
    const timeValue = parseTimeValue(row[timeColumn], spec.timeFormat);
    if (!isFinite(timeValue)) {
      continue;
    }

    const labels: Record<string, string> = {};
    for (const labelCol of labelColumns) {
      if (row[labelCol] !== undefined && row[labelCol] !== null) {
        labels[labelCol] = String(row[labelCol]);
      }
    }

    for (const valueCol of valueColumns) {
      const seriesKey = JSON.stringify({ ...labels, __name__: valueCol });

      if (!seriesMap.has(seriesKey)) {
        seriesMap.set(seriesKey, {
          name: valueCol,
          labels: { ...labels, __name__: valueCol },
          values: [],
        });
      }

      const series = seriesMap.get(seriesKey)!;
      const value = parseFloat(String(row[valueCol]));

      if (!isNaN(value)) {
        series.values.push([timeValue, value]);
      }
    }
  }

  const seriesArray = Array.from(seriesMap.values());
  for (const series of seriesArray) {
    series.values.sort((a, b) => a[0] - b[0]);
  }

  return seriesArray;
}

function detectTimeColumn(columns: Array<{ name: string; type: string }>): string | null {
  const timeKeywords = ['time', 'timestamp', 'datetime', 'date', 'created_at', 'updated_at'];

  for (const col of columns) {
    const colNameLower = col.name.toLowerCase();
    if (timeKeywords.some((keyword) => colNameLower.includes(keyword))) {
      return col.name;
    }
  }

  return null;
}

function parseTimeValue(value: unknown, format: string = 'iso8601'): number {
  if (value instanceof Date) {
    return value.getTime();
  }

  switch (format) {
    case 'unix':
      return parseInt(String(value), 10) * 1000;
    case 'unix_ms':
      return parseInt(String(value), 10);
    case 'iso8601':
    default:
      return new Date(String(value)).getTime();
  }
}

export const SQLTimeSeriesQuery: TimeSeriesQueryPlugin<SQLTimeSeriesQuerySpec> = {
  getTimeSeriesData,
  OptionsEditorComponent: SQLTimeSeriesQueryEditor,
  createInitialOptions: () => ({
    datasource: undefined,
    query: '',
    timeFormat: 'iso8601',
  }),
  dependsOn: (spec) => {
    return {
      variables: parseVariables(spec.query),
    };
  },
};
