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

export interface BarDataPoint {
  value: unknown;
}

export interface DataSeries {
  name?: string;
  formattedName?: string;
  legendName?: string;
  displayName?: string;
  legend?: string;
  labels?: Record<string, string>;
  values: Array<[number | string, unknown]> | BarDataPoint[];
}

export interface ExportableData {
  series: DataSeries[];
  metadata?: Record<string, unknown>;
}

export const isExportableData = (data: unknown): data is ExportableData => {
  if (!data || typeof data !== 'object') return false;
  const candidate = data as Record<string, unknown>;
  return Array.isArray(candidate.series) && candidate.series.length > 0;
};

export interface QueryDataInput {
  data?: unknown;
  error?: unknown;
}

export const extractExportableData = (queryResults: QueryDataInput[]): ExportableData | undefined => {
  if (!queryResults || queryResults.length === 0) return undefined;

  const allSeries: DataSeries[] = [];
  let metadata: ExportableData['metadata'] = undefined;

  queryResults.forEach((query) => {
    if (query?.data && typeof query.data === 'object' && 'series' in query.data) {
      const data = query.data as ExportableData;
      if (data.series && Array.isArray(data.series) && data.series.length > 0) {
        allSeries.push(...data.series);
        if (!metadata && data.metadata) {
          metadata = data.metadata;
        }
      }
    }
  });

  if (allSeries.length > 0) {
    return {
      series: allSeries,
      metadata,
    };
  }

  return undefined;
};

export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[<>:"/\\|?*]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
};

export const escapeCsvValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

export interface ExportDataOptions {
  data: ExportableData;
}

export const exportDataAsCSV = ({ data }: ExportDataOptions): Blob => {
  if (!isExportableData(data)) {
    console.warn('No valid data found to export to CSV.');
    return new Blob([''], { type: 'text/csv;charset=utf-8' });
  }

  const seriesData: Array<{ label: string; value: number | null }> = [];

  for (let i = 0; i < data.series.length; i++) {
    const series = data.series[i];

    if (!series) {
      continue;
    }

    if (!Array.isArray(series.values) || series.values.length === 0) {
      continue;
    }

    let aggregatedValue: number | null = null;

    for (let j = 0; j < series.values.length; j++) {
      const entry = series.values[j];
      let value: unknown;

      if (Array.isArray(entry) && entry.length >= 2) {
        value = entry[1];
      } else if (typeof entry === 'object' && entry !== null && 'value' in entry) {
        const dataPoint = entry as BarDataPoint;
        value = dataPoint.value;
      } else {
        continue;
      }

      if (value !== null && value !== undefined && !isNaN(Number(value))) {
        aggregatedValue = Number(value);
        break;
      }
    }

    seriesData.push({
      label: series.name || `Series ${i + 1}`,
      value: aggregatedValue,
    });
  }

  if (seriesData.length === 0) {
    console.warn('No valid series data found to export to CSV.');
    return new Blob([''], { type: 'text/csv;charset=utf-8' });
  }

  let csvString = 'Label,Value\n';

  for (let index = 0; index < seriesData.length; index++) {
    const item = seriesData[index];
    if (!item) continue;
    csvString += `${escapeCsvValue(item.label)},${escapeCsvValue(item.value)}`;
    if (index < seriesData.length - 1) {
      csvString += '\n';
    }
  }

  return new Blob([csvString], { type: 'text/csv;charset=utf-8' });
};
