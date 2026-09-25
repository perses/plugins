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

export interface BuildRawTableDataOptions {
  forExport?: boolean;
  expandTimeSeries?: boolean;
  queryMode?: 'instant' | 'range';
}

export function needsTimeSeriesExpansion(spec: TableOptions): boolean {
  const transforms = spec.transforms ?? [];
  for (let i = transforms.length - 1; i >= 0; i--) {
    const t = transforms[i];
    if (!t || t.spec?.disabled === true) {
      continue;
    }
    return t.kind === 'PivotByLabel';
  }
  return false;
}

export function getTablePanelQueryMode(spec: TableOptions): 'instant' | 'range' {
  if ((spec.columnSettings ?? []).some((c) => c.plugin)) {
    return 'range';
  }
  if (needsTimeSeriesExpansion(spec)) {
    return 'range';
  }
  return 'instant';
}

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
  const queryMode = options.queryMode ?? getTablePanelQueryMode(spec);
  const expandTime = options.expandTimeSeries ?? needsTimeSeriesExpansion(spec);

  return queryResults.flatMap((data: PanelData<TimeSeriesData>, queryIndex: number) =>
    (data.data?.series ?? []).flatMap((ts: TimeSeries) => {
      const valueColumnName = queryResults.length === 1 ? 'value' : `value #${queryIndex + 1}`;
      const labels =
        queryResults.length === 1
          ? ts.labels
          : Object.entries(ts.labels ?? {}).reduce((acc, [key, value]) => {
              if (key) acc[`${key} #${queryIndex + 1}`] = value;
              return acc;
            }, {} as Labels);

      const points = ts.values ?? [];
      if (points.length === 0) {
        return [{ ...labels }];
      }

      if (expandTime) {
        return points.map(([tsMs, value]) => ({
          timestamp: tsMs,
          [valueColumnName]: value,
          ...labels,
        }));
      }

      const lastPoint = points[points.length - 1];
      if (lastPoint === undefined) {
        return [{ ...labels }];
      }

      let columnValue: unknown;
      if (forExport) {
        columnValue = lastPoint[1];
      } else {
        const hasPlugin = (spec.columnSettings ?? []).find((x) => x.name === valueColumnName)?.plugin;
        columnValue = hasPlugin
          ? { ...data, data: { ...data.data, series: data.data.series.filter((s) => s === ts) } }
          : lastPoint[1];
      }

      if (queryMode === 'instant') {
        return [{ timestamp: lastPoint[0], [valueColumnName]: columnValue, ...labels }];
      }
      return [{ [valueColumnName]: columnValue, ...labels }];
    }),
  );
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
