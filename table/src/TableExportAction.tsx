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

import React, { useCallback, useMemo } from 'react';
import { PanelData, sanitizeFilename } from '@perses-dev/plugin-system';
import { InfoTooltip } from '@perses-dev/components';
import { IconButton } from '@mui/material';
import DownloadIcon from 'mdi-material-ui/Download';
import { Labels, TimeSeries, TimeSeriesData, transformData } from '@perses-dev/core';
import { getTablePanelQueryOptions, TableProps } from './components';
import type { TableOptions } from './models';

export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface ExportColumn {
  key: string;
  header: string;
}

/**
 * Converts raw query results into the same tabular structure that TablePanel
 * renders, applying indexed column naming and configured transforms so the
 * CSV output matches the visual table.
 *
 * NOTE: The row-building logic here intentionally mirrors TablePanel's rawData
 * useMemo (see TablePanel.tsx). If the table's data pipeline changes, this
 * function must be updated to match.
 */
export function buildTableData(
  queryResults: Array<PanelData<TimeSeriesData>>,
  spec: TableOptions
): { data: Array<Record<string, unknown>>; columns: ExportColumn[] } {
  const queryMode = getTablePanelQueryOptions(spec).mode;

  const rawData: Array<Record<string, unknown>> = queryResults
    .flatMap((data: PanelData<TimeSeriesData>, queryIndex: number) =>
      (data.data?.series ?? []).map((ts: TimeSeries) => ({ ts, queryIndex }))
    )
    .map(({ ts, queryIndex }: { ts: TimeSeries; queryIndex: number }) => {
      if (ts.values[0] === undefined) {
        return { ...ts.labels };
      }

      const valueColumnName = queryResults.length === 1 ? 'value' : `value #${queryIndex + 1}`;
      const labels =
        queryResults.length === 1
          ? ts.labels
          : Object.entries(ts.labels ?? {}).reduce((acc, [key, value]) => {
              if (key) acc[`${key} #${queryIndex + 1}`] = value;
              return acc;
            }, {} as Labels);

      // Always use the raw scalar value for export (skip embedded panel plugin objects)
      const columnValue = ts.values[0][1];

      if (queryMode === 'instant') {
        return { timestamp: ts.values[0][0], [valueColumnName]: columnValue, ...labels };
      }
      return { [valueColumnName]: columnValue, ...labels };
    });

  const transformed = transformData(rawData, spec.transforms ?? []);

  const allKeys: string[] = [];
  for (const entry of transformed) {
    for (const key of Object.keys(entry)) {
      if (!allKeys.includes(key)) allKeys.push(key);
    }
  }

  const columnSettings = spec.columnSettings ?? [];
  const columns: ExportColumn[] = [];
  const customized = new Set<string>();

  for (const col of columnSettings) {
    if (customized.has(col.name)) continue;
    customized.add(col.name);
    if (col.hide) continue;
    columns.push({ key: col.name, header: col.header ?? col.name });
  }

  if (!spec.defaultColumnHidden) {
    for (const key of allKeys) {
      if (!customized.has(key)) {
        columns.push({ key, header: key });
      }
    }
  }

  return { data: transformed, columns };
}

export const TableExportAction: React.FC<TableProps> = ({ queryResults, spec, definition }) => {
  const tableData = useMemo(() => buildTableData(queryResults, spec), [queryResults, spec]);

  const canExport = tableData.data.length > 0 && tableData.columns.length > 0;

  const handleExport = useCallback(() => {
    if (!canExport) return;

    try {
      const title = definition?.spec?.display?.name || 'Table Data';
      const { data, columns } = tableData;

      const headerRow = columns.map((c) => escapeCsvValue(c.header)).join(',');
      const dataRows = data.map((row) => columns.map((col) => escapeCsvValue(row[col.key])).join(','));

      const csvString = [headerRow, ...dataRows].join('\n') + '\n';
      const csvBlob = new Blob([csvString], { type: 'text/csv;charset=utf-8' });

      const baseFilename = sanitizeFilename(title);
      const filename = `${baseFilename}_data.csv`;

      const url = URL.createObjectURL(csvBlob);
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Table CSV export failed:', error);
    }
  }, [canExport, tableData, definition]);

  if (!canExport) {
    return null;
  }

  return (
    <InfoTooltip description="Export as CSV">
      <IconButton size="small" onClick={handleExport} aria-label="Export table data as CSV">
        <DownloadIcon fontSize="inherit" />
      </IconButton>
    </InfoTooltip>
  );
};
