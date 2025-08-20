// Copyright 2023 The Perses Authors
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
import { IconButton, Tooltip } from '@mui/material';
import DownloadIcon from 'mdi-material-ui/Download';
import { TimeSeriesChartProps } from './TimeSeriesChartPanel';
import { extractExportableData, isExportableData, sanitizeFilename, exportDataAsCSV } from './CSVExportUtils';

export const TimeSeriesExportAction: React.FC<TimeSeriesChartProps> = ({ queryResults, definition }) => {
  const exportableData = useMemo(() => {
    return extractExportableData(queryResults);
  }, [queryResults]);

  const canExport = useMemo(() => {
    return isExportableData(exportableData);
  }, [exportableData]);

  const handleExport = useCallback(() => {
    if (!exportableData || !canExport) return;

    try {
      const title = definition?.spec?.display?.name || 'Time Series Data';

      const csvBlob = exportDataAsCSV({
        data: exportableData,
      });

      const baseFilename = sanitizeFilename(title);
      const filename = `${baseFilename}_data.csv`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(csvBlob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Time series export failed:', error);
    }
  }, [exportableData, canExport, definition]);

  if (!canExport) {
    return null;
  }

  return (
    <Tooltip title="Export as CSV">
      <IconButton size="small" onClick={handleExport} aria-label="Export time series data as CSV">
        <DownloadIcon fontSize="inherit" />
      </IconButton>
    </Tooltip>
  );
};
