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

import { Labels, TimeSeries, TimeSeriesData } from '@perses-dev/core';
import { PanelData } from '@perses-dev/plugin-system';
import { TableOptions } from './models';

/**
 * Options for building raw table data.
 */
export interface BuildRawTableDataOptions {
  /**
   * When true, always use raw scalar values for cell data (for export).
   * When false, plugin columns will contain embedded PanelData objects (for rendering).
   */
  forExport?: boolean;
}

/**
 * Determines the query mode based on table options.
 * If any column has a plugin (embedded panel), use range mode; otherwise instant.
 */
export function getTablePanelQueryMode(spec: TableOptions): 'instant' | 'range' {
  return (spec.columnSettings ?? []).some((c) => c.plugin) ? 'range' : 'instant';
}

/**
 * Converts raw query results into a tabular format.
 *
 * This is the shared data-building logic used by both TablePanel (for rendering)
 * and TableExportAction (for CSV export). Extracting this ensures both use the
 * same transformation logic, reducing drift.
 *
 * @param queryResults - The panel query results containing time series data
 * @param spec - The table options specification
 * @param options - Build options (e.g., forExport mode)
 * @returns Array of row objects with column keys and values
 */
export function buildRawTableData(
  queryResults: Array<PanelData<TimeSeriesData>>,
  spec: TableOptions,
  options: BuildRawTableDataOptions = {}
): Array<Record<string, unknown>> {
  const { forExport = false } = options;
  const queryMode = getTablePanelQueryMode(spec);

  return queryResults
    .flatMap((data: PanelData<TimeSeriesData>, queryIndex: number) =>
      (data.data?.series ?? []).map((ts: TimeSeries) => ({ data, ts, queryIndex }))
    )
    .map(({ data, ts, queryIndex }: { data: PanelData<TimeSeriesData>; ts: TimeSeries; queryIndex: number }) => {
      if (ts.values[0] === undefined) {
        return { ...ts.labels };
      }

      // If there are multiple queries, add query index to value key and label keys to avoid conflicts
      const valueColumnName = queryResults.length === 1 ? 'value' : `value #${queryIndex + 1}`;
      const labels =
        queryResults.length === 1
          ? ts.labels
          : Object.entries(ts.labels ?? {}).reduce((acc, [key, value]) => {
              if (key) acc[`${key} #${queryIndex + 1}`] = value;
              return acc;
            }, {} as Labels);

      // For export: always use raw scalar values
      // For rendering: plugin columns get embedded PanelData objects
      let columnValue: unknown;
      if (forExport) {
        columnValue = ts.values[0][1];
      } else {
        const hasPlugin = (spec.columnSettings ?? []).find((x) => x.name === valueColumnName)?.plugin;
        columnValue = hasPlugin
          ? { ...data, data: { ...data.data, series: data.data.series.filter((s) => s === ts) } }
          : ts.values[0][1];
      }

      if (queryMode === 'instant') {
        // Timestamp is not indexed as it will be the same for all queries
        return { timestamp: ts.values[0][0], [valueColumnName]: columnValue, ...labels };
      } else {
        // Don't add a timestamp for range queries
        return { [valueColumnName]: columnValue, ...labels };
      }
    });
}
