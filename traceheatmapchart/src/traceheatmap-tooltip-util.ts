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

/* shortened */
const min = Math.min;
const max = Math.max;

import { TopLevelFormatterParams } from 'echarts/types/dist/shared';
import { HeatmapChartData, FlatQueryResults } from './traceheatmap-chart-data-util';

export const escapeHtml = (value: string): string => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&alt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

export type ToolTipChartData = Pick<
  HeatmapChartData,
  'durationBuckets' | 'timeBuckets' | 'bucketCountMap' | 'bucketToFlatResultsMap'
> & { flatResults: FlatQueryResults };

export const createBucketToolTip = (params: TopLevelFormatterParams, toolTipChartData: ToolTipChartData): string => {
  if (Array.isArray(params)) {
    return '';
  }

  const { bucketCountMap, durationBuckets, timeBuckets, bucketToFlatResultsMap, flatResults } = toolTipChartData;
  const [column, row, count] = params.value as [number, number, number];
  const bucketDetails: Array<{ label: string; value: string | undefined; elementId: string }> = [];

  const generateId = (column: number, row: number, element: string): string =>
    `bucket-${column}-${row}-tooltip-${element}`;

  bucketDetails.push({
    label: 'Time',
    value: timeBuckets[column]?.label,
    elementId: generateId(column, row, 'time'),
  });

  bucketDetails.push({
    label: 'Duration',
    elementId: generateId(column, row, 'duration'),
    value: ((): string => {
      const begin = durationBuckets[row];
      const end = durationBuckets[row + 1];
      if (end === undefined) {
        return `+${begin?.start} ms`;
      }
      return `${begin?.start}ms-${end.start}ms`;
    })(),
  });

  bucketDetails.push({
    label: 'Traces',
    value: Number(count) + '',
    elementId: generateId(column, row, 'traces'),
  });

  bucketDetails.push({
    label: 'Share of traces',
    elementId: generateId(column, row, 'shared'),
    value: ((): string | undefined => {
      const total = (bucketCountMap[column] || []).reduce((prev, current) => {
        return typeof current === 'number' ? prev + current : prev;
      }, 0);
      const current = bucketCountMap[column]?.[row];
      return total === undefined || current === undefined ? undefined : `${((current / total) * 100).toFixed(2)}%`;
    })(),
  });

  bucketDetails.push({
    label: 'Min',
    elementId: generateId(column, row, 'min'),
    value: ((): string | undefined => {
      const indexes = bucketToFlatResultsMap[column]?.[row];
      if (!indexes?.length) return undefined;

      let minimum = Infinity;
      for (const idx of indexes) {
        const result = flatResults[idx];
        if (result) {
          minimum = min(result.durationMs, minimum);
        }
      }

      return Number.isFinite(minimum) ? `${minimum}` : undefined;
    })(),
  });

  bucketDetails.push({
    label: 'Max',
    elementId: generateId(column, row, 'max'),
    value: ((): string | undefined => {
      const indexes = bucketToFlatResultsMap[column]?.[row];
      if (!indexes?.length) return undefined;

      let maximum = -Infinity;
      for (const idx of indexes) {
        const result = flatResults[idx];
        if (result) {
          maximum = max(result.durationMs, maximum);
        }
      }

      return Number.isFinite(maximum) ? `${maximum}` : undefined;
    })(),
  });

  return `<div style="
                  id=${generateId(column, row, 'container')}
                  min-width: 190px;
                  font-size: 13px;
                  line-height: 1.5;">
                ${((): string => {
                  return bucketDetails
                    .filter((i) => i.value)
                    .map(
                      (i) => `<div
                    id="${i.elementId}"
                    style="
                    opacity: 0.75;
                    padding:2px;">
                    <span style="font-weight:bold;">${escapeHtml(i.label)}:</span> ${escapeHtml(i.value || '')}
                  </div>`
                    )
                    .join('');
                })()}
                </div>`;
};
