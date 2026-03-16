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
