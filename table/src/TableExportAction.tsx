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
import { escapeCsvValue, PanelData, sanitizeFilename } from '@perses-dev/plugin-system';
import { InfoTooltip } from '@perses-dev/components';
import { IconButton } from '@mui/material';
import DownloadIcon from 'mdi-material-ui/Download';
import { TimeSeriesData, transformData } from '@perses-dev/core';
import { TableProps } from './components';
import type { TableOptions } from './models';
import { buildRawTableData } from './table-data-utils';

export interface ExportColumn {
  key: string;
  header: string;
}

/**
 * Converts raw query results into the same tabular structure that TablePanel
 * renders, applying indexed column naming and configured transforms so the
 * CSV output matches the visual table.
 */
export function buildTableData(
  queryResults: Array<PanelData<TimeSeriesData>>,
  spec: TableOptions
): { data: Array<Record<string, unknown>>; columns: ExportColumn[] } {
  // Use shared utility with forExport=true to get raw scalar values
  const rawData = buildRawTableData(queryResults, spec, { forExport: true });

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
