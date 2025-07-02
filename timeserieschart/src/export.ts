// Copyright 2025 The Perses Authors
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

import { TimeSeriesData } from '@perses-dev/core';
import { exportTimeSeriesAsCSV, isTimeSeriesData, sanitizeFilename } from './CSVExportUtils';

// Define all export interfaces directly in the plugin
export interface ExportFormat {
  name: string;
  extension: string;
  mimeType: string;
}

export interface ExportData {
  format: ExportFormat;
  data: Blob;
  filename: string;
}

export interface DataExportCapability {
  getSupportedFormats(): ExportFormat[];
  exportData(format: ExportFormat, options?: ExportOptions): Promise<ExportData>;
}

export interface ExportOptions {
  title?: string;
  projectName?: string;
  customFilename?: string;
  includeMetadata?: boolean;
}

export const EXPORT_FORMATS = {
  CSV: { name: 'CSV', extension: 'csv', mimeType: 'text/csv' },
  JSON: { name: 'JSON', extension: 'json', mimeType: 'application/json' },
} as const;

export class TimeSeriesDataExporter implements DataExportCapability {
  constructor(
    private queryResults: TimeSeriesData,
    private title: string,
    private projectName?: string
  ) {}

  getSupportedFormats() {
    // Only show CSV for time series data
    if (!isTimeSeriesData(this.queryResults)) {
      return [];
    }
    return [EXPORT_FORMATS.CSV];
  }

  async exportData(format: ExportFormat, options: ExportOptions = {}): Promise<ExportData> {
    if (format.name !== 'CSV') {
      throw new Error(`Unsupported export format: ${format.name}`);
    }

    // Use existing CSV export logic (now returns Blob)
    const csvBlob = exportTimeSeriesAsCSV({
      queryResults: this.queryResults,
      title: options.title || this.title,
      projectName: options.projectName || this.projectName,
    });

    return {
      format,
      data: csvBlob,
      filename: options.customFilename || this.generateFilename(format, options),
    };
  }

  private generateFilename(format: ExportFormat, options: ExportOptions): string {
    const title = options.title || this.title;
    const projectName = options.projectName || this.projectName;

    if (projectName) {
      return `${sanitizeFilename(projectName)}_${sanitizeFilename(title)}_data.${format.extension}`;
    }
    return `${sanitizeFilename(title)}_data.${format.extension}`;
  }
}
