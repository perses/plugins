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
import { TimeSeriesData } from '@perses-dev/core';
import { TimeSeriesChartProps } from './TimeSeriesChartPanel';
import { exportTimeSeriesAsCSV, isTimeSeriesData, sanitizeFilename } from './CSVExportUtils';

interface TimeSeriesExportActionProps extends TimeSeriesChartProps {
  projectName?: string;
}

export const TimeSeriesExportAction: React.FC<TimeSeriesExportActionProps> = ({
  queryResults,
  definition,
  projectName,
}) => {
  const timeSeriesData = useMemo((): TimeSeriesData | undefined => {
    if (!queryResults || queryResults.length === 0) return undefined;

    const allSeries: TimeSeriesData['series'] = [];
    let timeRange: TimeSeriesData['timeRange'] = undefined;
    let stepMs: number | undefined = undefined;
    let metadata: TimeSeriesData['metadata'] = undefined;

    queryResults.forEach((query) => {
      if (query?.data && typeof query.data === 'object' && 'series' in query.data) {
        const tsData = query.data as TimeSeriesData;
        if (tsData.series && Array.isArray(tsData.series) && tsData.series.length > 0) {
          allSeries.push(...tsData.series);
          if (!timeRange && tsData.timeRange) {
            timeRange = tsData.timeRange;
          }
          if (!stepMs && tsData.stepMs) {
            stepMs = tsData.stepMs;
          }
          if (!metadata && tsData.metadata) {
            metadata = tsData.metadata;
          }
        }
      }
    });

    if (allSeries.length > 0) {
      const combinedData: TimeSeriesData = {
        series: allSeries,
        timeRange,
        stepMs,
        metadata,
      };
      return combinedData;
    }

    return undefined;
  }, [queryResults]);

  const canExport = useMemo(() => {
    return timeSeriesData && isTimeSeriesData(timeSeriesData);
  }, [timeSeriesData]);

  // Self-contained click handler
  const handleExport = useCallback(() => {
    if (!timeSeriesData || !canExport) return;

    try {
      const title = definition?.spec?.display?.name || 'Panel Data';

      const csvBlob = exportTimeSeriesAsCSV({
        queryResults: timeSeriesData,
        title,
        projectName,
      });

      const baseFilename = sanitizeFilename(title);
      const filename = projectName
        ? `${sanitizeFilename(projectName)}_${baseFilename}_data.csv`
        : `${baseFilename}_data.csv`;

      const link = document.createElement('a');
      link.href = URL.createObjectURL(csvBlob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [timeSeriesData, canExport, definition, projectName]);

  // Don't render if we can't export
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
