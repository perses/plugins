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
import { replaceSQLBuiltinVariables } from '../../model/replace-sql-builtin-variables';
import { SQLTimeSeriesQuerySpec } from './sql-time-series-query-types';
import { SQLTimeSeriesQueryEditor } from './SQLTimeSeriesQueryEditor';

async function getTimeSeriesData(
  spec: SQLTimeSeriesQuerySpec,
  context: any,
  abortSignal?: AbortSignal
): Promise<TimeSeriesData> {
  const { timeRange, datasourceStore } = context;

  if (!spec.query) {
    return { series: [] };
  }

  // Determine datasource selector
  const datasourceSelector = spec.datasource || { kind: 'SQLDatasource' };

  // Get datasource client for proxy URL
  const datasourceClient = await datasourceStore.getDatasourceClient(datasourceSelector);

  if (!datasourceClient) {
    throw new Error('No datasource configured for SQL query. Please select a SQL datasource.');
  }

  const { datasourceUrl } = datasourceClient.options;

  if (!datasourceUrl) {
    throw new Error('No datasource URL available. Ensure the SQL datasource is properly configured.');
  }

  // Calculate an interval based on time range
  const rangeDuration = (timeRange.end.getTime() - timeRange.start.getTime()) / 1000;
  const interval = spec.minStep || Math.max(1, Math.floor(rangeDuration / 1000));
  const intervalMs = interval * 1000;

  // Process SQL macros and builtin variables
  const processedQuery = replaceSQLBuiltinVariables(spec.query, timeRange, intervalMs);

  // Execute query via backend proxy
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

  const result = await response.json();

  // Transform result to time series data
  const series = transformToTimeSeries(result, spec);

  return {
    series,
    timeRange,
    stepMs: intervalMs,
  };
}

function transformToTimeSeries(result: any, spec: SQLTimeSeriesQuerySpec): TimeSeries[] {
  const { columns, rows } = result;

  if (!rows || rows.length === 0) {
    return [];
  }

  // Auto-detect time column if not specified
  const timeColumn = spec.timeColumn || detectTimeColumn(columns);
  if (!timeColumn) {
    throw new Error('No time column found in query result');
  }

  // Detect value columns (numeric columns that are not time or labels)
  const labelColumns = spec.labelColumns || [];
  const valueColumns =
    spec.valueColumns ||
    columns.map((col: any) => col.name).filter((name: string) => name !== timeColumn && !labelColumns.includes(name));

  // Group rows by label combination
  const seriesMap = new Map<string, TimeSeries>();

  for (const row of rows) {
    const timeValue = parseTimeValue(row[timeColumn], spec.timeFormat);

    // Create label set for this row
    const labels: Record<string, string> = {};
    for (const labelCol of labelColumns) {
      if (row[labelCol] !== undefined && row[labelCol] !== null) {
        labels[labelCol] = String(row[labelCol]);
      }
    }

    // Process each value column
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
      const value = parseFloat(row[valueCol]);

      if (!isNaN(value)) {
        series.values.push([timeValue, value]);
      }
    }
  }

  // Sort all series by time
  const seriesArray = Array.from(seriesMap.values());
  for (const series of seriesArray) {
    series.values.sort((a: any, b: any) => a[0] - b[0]);
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

function parseTimeValue(value: any, format: string = 'iso8601'): number {
  if (value instanceof Date) {
    return value.getTime();
  }

  switch (format) {
    case 'unix':
      return parseInt(value, 10) * 1000;
    case 'unix_ms':
      return parseInt(value, 10);
    case 'iso8601':
    default:
      return new Date(value).getTime();
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
};
