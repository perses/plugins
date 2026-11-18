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

import type { FontSizeOption, FormatOptions, ThresholdOptions, ValueMapping } from '@perses-dev/components';
import type { CalculationType, OptionsEditorProps } from '@perses-dev/plugin-system';
import type { Definition } from '@perses-dev/spec';

/**
 * The schema for a StatChart panel.
 */
export interface StatChartDefinition extends Definition<StatChartOptions> {
  kind: 'StatChart';
}

export type ColorMode = 'none' | 'value' | 'background_solid';

export type ColorModeLabelItem = {
  id: ColorMode;
  label: string;
};

export const COLOR_MODE_LABELS: ColorModeLabelItem[] = [
  { id: 'none', label: 'None' },
  { id: 'value', label: 'Text' },
  { id: 'background_solid', label: 'Background' },
];

export type legendMode = 'auto' | 'on' | 'off';

export type StatChartOrientation = 'auto' | 'horizontal' | 'vertical';

export type ShowLegendLabelItem = {
  id: legendMode;
  label: string;
  description?: string;
};

export const SHOW_LEGEND_LABELS: ShowLegendLabelItem[] = [
  { id: 'auto', label: 'Auto', description: 'Show legend for multi-series, hide legend for single series' },
  { id: 'on', label: 'On', description: 'Always show legend' },
  { id: 'off', label: 'Off', description: 'Always hide legend' },
];

export const STAT_CHART_ORIENTATION_LABELS: Array<{ id: StatChartOrientation; label: string }> = [
  { id: 'auto', label: 'Auto' },
  { id: 'horizontal', label: 'Horizontal' },
  { id: 'vertical', label: 'Vertical' },
];

export interface StatChartOptions {
  calculation: CalculationType;
  format: FormatOptions;
  metricLabel?: string;
  thresholds?: ThresholdOptions;
  sparkline?: StatChartSparklineOptions;
  valueFontSize?: FontSizeOption;
  legendFontSize?: FontSizeOption;
  mappings?: ValueMapping[];
  colorMode?: ColorMode;
  legendMode?: legendMode;
  orientation?: StatChartOrientation;
  seriesColumns?: number;
}

export const MAX_SERIES_COLUMNS = 12;

export type SeriesColumnsLabelItem = { id: string; label: string };

export const SERIES_COLUMNS_LABELS: SeriesColumnsLabelItem[] = [
  { id: 'auto', label: 'Auto' },
  ...Array.from({ length: MAX_SERIES_COLUMNS }, (_, i) => {
    const n = String(i + 1);
    return { id: n, label: n };
  }),
];

export function computeIdealSeriesColumns(seriesCount: number): number {
  if (seriesCount <= 1) return 1;
  return Math.ceil(Math.sqrt(seriesCount));
}

export function resolveAutoOrientationColumnsCount(
  seriesCount: number,
  widthBasedColumnCount: number,
  seriesColumns?: number,
): number {
  if (seriesCount <= 1) return 1;
  if (seriesColumns !== undefined && seriesColumns !== null && seriesColumns >= 1) {
    return Math.min(MAX_SERIES_COLUMNS, Math.floor(seriesColumns), seriesCount);
  }
  const ideal = computeIdealSeriesColumns(seriesCount);
  const width = Math.max(1, widthBasedColumnCount);
  return Math.max(1, Math.min(seriesCount, width, ideal));
}

// Share the panel height across auto-orientation rows
export function resolveAutoOrientationTileHeight(
  panelHeight: number,
  rowCount: number,
  spacing: number,
  minTileHeight: number,
): number {
  const rows = Math.max(1, Math.floor(rowCount));
  const gaps = Math.max(0, spacing) * Math.max(0, rows - 1);
  const available = Math.max(0, panelHeight - gaps);
  return Math.max(minTileHeight, Math.floor(available / rows));
}

const SPARKLINE_BAND_MIN_HEIGHT = 24;
const SPARKLINE_BAND_MAX_HEIGHT = 72;
// The sparkline keeps at most this share of the space under the series name.
// The value uses the rest, so the number stays readable when the panel grows.
const SPARKLINE_BAND_MAX_RATIO = 0.4;

export function resolveSparklineBandHeight(availableHeight: number): number {
  if (availableHeight <= 0) return 0;
  const preferred = Math.min(SPARKLINE_BAND_MAX_HEIGHT, Math.max(SPARKLINE_BAND_MIN_HEIGHT, availableHeight * 0.3));
  return Math.min(availableHeight * SPARKLINE_BAND_MAX_RATIO, preferred);
}

export interface StatChartSparklineOptions {
  color?: string;
  width?: number;
  areaOpacity?: number;
}

export type StatChartOptionsEditorProps = OptionsEditorProps<StatChartOptions>;

export function createInitialStatChartOptions(): StatChartOptions {
  return {
    calculation: 'last-number',
    format: {
      unit: 'decimal',
    },
    legendMode: 'off',
    orientation: 'auto',
  };
}
