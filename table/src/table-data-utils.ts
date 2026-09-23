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

import type { Labels, PanelData } from '@perses-dev/plugin-system';
import type { JsonData, TimeSeries, TimeSeriesData } from '@perses-dev/spec';

import type { TableOptions } from './models';

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
 * True when transforms need one table row per timestamp (e.g. PivotByLabel time × label).
 * Without this, buildRawTableData keeps only the last sample per series → pivot collapses to one row.
 */
export function needsTimeSeriesExpansion(spec: TableOptions): boolean {
  return (spec.transforms ?? []).some(
    (t) => t.kind === 'PivotByLabel' && t.spec?.disabled !== true,
  );
}

/**
 * Determines the query mode based on table options.
 * Range mode when embedded panel plugins need history, or PivotByLabel needs all timestamps.
 */
export function getTablePanelQueryMode(spec: TableOptions): 'instant' | 'range' {
  if (needsTimeSeriesExpansion(spec)) {
    return 'range';
  }
  return (spec.columnSettings ?? []).some((c) => c.plugin) ? 'range' : 'instant';
}

function labelColumns(
  ts: TimeSeries,
  queryIndex: number,
  multiQuery: boolean,
): Labels {
  if (!multiQuery) {
    return ts.labels ?? {};
  }
  return Object.entries(ts.labels ?? {}).reduce((acc, [key, value]) => {
    if (key) acc[`${key} #${queryIndex + 1}`] = value;
    return acc;
  }, {} as Labels);
}

function valueColumnName(queryIndex: number, multiQuery: boolean): string {
  return multiQuery ? `value #${queryIndex + 1}` : 'value';
}

/**
 * Converts raw query results into a tabular format.
 * Shared by TablePanel (render) and TableExportAction (CSV).
 * Default: last sample per series. With enabled PivotByLabel: one row per timestamp.
 */
export function buildRawTableData(
  queryResults: PanelData[],
  spec: TableOptions,
  options: BuildRawTableDataOptions = {},
): Array<Record<string, unknown>> {
  const timeSeriesResults: Array<PanelData<TimeSeriesData>> = queryResults.filter(
    (r): r is PanelData<TimeSeriesData> => r.definition.kind === 'TimeSeriesQuery',
  );
  const jsonResults: Array<PanelData<JsonData>> = queryResults.filter(
    (r): r is PanelData<JsonData> => r.definition.kind === 'JsonQuery',
  );
  return [...buildTimeSeriesTableData(timeSeriesResults, spec, options), ...buildJsonTableData(jsonResults)];
}

function buildTimeSeriesTableData(
  queryResults: Array<PanelData<TimeSeriesData>>,
  spec: TableOptions,
  options: BuildRawTableDataOptions = {},
): Array<Record<string, unknown>> {
  const { forExport = false } = options;
  const queryMode = getTablePanelQueryMode(spec);
  const expandTime = needsTimeSeriesExpansion(spec);
  const multiQuery = queryResults.length > 1;

  const rows: Array<Record<string, unknown>> = [];

  for (let queryIndex = 0; queryIndex < queryResults.length; queryIndex++) {
    const data = queryResults[queryIndex];
    if (!data) continue;
    const seriesList = data.data?.series ?? [];

    for (const ts of seriesList) {
      const labels = labelColumns(ts, queryIndex, multiQuery);
      const valueCol = valueColumnName(queryIndex, multiQuery);
      const points = ts.values ?? [];

      if (points.length === 0) {
        rows.push({ ...labels });
        continue;
      }

      if (expandTime) {
        for (const point of points) {
          const [tsMs, value] = point;
          rows.push({
            timestamp: tsMs,
            [valueCol]: value,
            ...labels,
          });
        }
        continue;
      }

      // Default: last sample only
      const lastPoint = points[points.length - 1];
      if (lastPoint === undefined) {
        rows.push({ ...labels });
        continue;
      }

      let columnValue: unknown;
      if (forExport) {
        columnValue = lastPoint[1];
      } else {
        const hasPlugin = (spec.columnSettings ?? []).find((x) => x.name === valueCol)?.plugin;
        columnValue = hasPlugin
          ? { ...data, data: { ...data.data, series: data.data.series.filter((s) => s === ts) } }
          : lastPoint[1];
      }

      if (queryMode === 'instant') {
        rows.push({ timestamp: lastPoint[0], [valueCol]: columnValue, ...labels });
      } else {
        rows.push({ [valueCol]: columnValue, ...labels });
      }
    }
  }

  return rows;
}

function safeStringify(v: object): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function toItemArray<T>(data: T): T[] {
  if (Array.isArray(data)) return data;
  if (data !== null && data !== undefined) return [data];
  return [];
}

export function buildJsonTableData(queryResults: Array<PanelData<JsonData>>): Array<Record<string, unknown>> {
  return queryResults.flatMap((r: PanelData<JsonData>) => {
    return toItemArray(r.data).map(({ data }) => {
      if (typeof data !== 'object' || data === null) {
        return { value: data };
      }
      const row: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
        row[k] = typeof v === 'object' && v !== null ? safeStringify(v) : v;
      }
      return row;
    });
  });
}
