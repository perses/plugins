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
import DownloadIcon from 'mdi-material-ui/Download';
import { sanitizeFilename } from '@perses-dev/plugin-system';
import { useCallback, useMemo } from 'react';
import { LogsTableProps } from './model';

export const LogsTableExportAction: React.FC<LogsTableProps> = ({ queryResults, definition }) => {
  const exportedResult = useMemo(() => {
    return queryResults.flatMap((q) => q.data?.logs?.entries ?? []);
  }, [queryResults]);

  const isDisabled = !exportedResult.length;

  const handleDownload = useCallback((): void => {
    if (isDisabled) return;
    try {
      const jsonString = JSON.stringify(exportedResult, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const title = definition?.spec?.display?.name || 'Logs Table Data';
      const baseFilename = sanitizeFilename(title);
      link.download = `${baseFilename}_data.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Logs table export failed:', error);
    }
  }, [definition, exportedResult, isDisabled]);

  return (
    <InfoTooltip description={isDisabled ? 'No data to export' : 'Export as JSON'}>
      <IconButton
        disabled={isDisabled}
        size="small"
        onClick={handleDownload}
        aria-label="Export Logs Table Data as JSON"
      >
        <DownloadIcon fontSize="inherit" />
      </IconButton>
    </InfoTooltip>
  );
};
