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

import { InfoTooltip } from '@perses-dev/components';
import { IconButton } from '@mui/material';
import FileDelimitedOutline from 'mdi-material-ui/FileDelimitedOutline';
import { escapeCsvValue, formatTimestampISO, sanitizeFilename } from '@perses-dev/plugin-system';
import { LogEntry } from '@perses-dev/spec';
import { useCallback, useMemo } from 'react';
import { LogsTableProps } from './model';
import { stripAnsi } from './utils/ansi';

export function collectLabelKeys(entries: LogEntry[]): string[] {
  const keys = new Set<string>();
  for (const entry of entries) {
    for (const key of Object.keys(entry.labels)) {
      keys.add(key);
    }
  }
  return Array.from(keys).sort();
}

export function buildLogsCsvString(entries: LogEntry[]): string {
  const labelKeys = collectLabelKeys(entries);

  const headerColumns = ['timestamp', 'body', ...labelKeys];
  const headerRow = headerColumns.map(escapeCsvValue).join(',');

  const dataRows = entries.map((entry) => {
    const timestamp = escapeCsvValue(formatTimestampISO(entry.timestamp));
    const body = escapeCsvValue(stripAnsi(entry.line));
    const labels = labelKeys.map((key) => escapeCsvValue(entry.labels[key] ?? ''));
    return [timestamp, body, ...labels].join(',');
  });

  return [headerRow, ...dataRows].join('\n') + '\n';
}

export const LogsTableCsvExportAction: React.FC<LogsTableProps> = ({ queryResults, definition }) => {
  const entries = useMemo(() => {
    return queryResults.flatMap((q) => q.data?.logs?.entries ?? []);
  }, [queryResults]);

  const isDisabled = !entries.length;

  const handleDownload = useCallback((): void => {
    if (isDisabled) return;
    try {
      const csvString = buildLogsCsvString(entries);
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const title = definition?.spec?.display?.name || 'Logs Table Data';
      const baseFilename = sanitizeFilename(title);
      link.download = `${baseFilename}_data.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Logs table CSV export failed:', error);
    }
  }, [definition, entries, isDisabled]);

  return (
    <InfoTooltip description={isDisabled ? 'No data to export' : 'Export as CSV'}>
      <IconButton
        disabled={isDisabled}
        size="small"
        onClick={handleDownload}
        aria-label="Export Logs Table Data as CSV"
      >
        <FileDelimitedOutline fontSize="inherit" />
      </IconButton>
    </InfoTooltip>
  );
};
