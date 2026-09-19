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

/** Multi-series cell layout. */
export type SeriesLayoutMode = 'auto' | 'row' | 'grid';

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

export const SERIES_LAYOUT_LABELS: Array<{ id: SeriesLayoutMode; label: string; description: string }> = [
  {
    id: 'auto',
    label: 'Auto',
    description: 'Pick a matrix from series count (e.g. 4 → 2×2, 6 → 3×2)',
  },
  { id: 'row', label: 'Row', description: 'Single horizontal row (legacy)' },
  { id: 'grid', label: 'Grid', description: 'Wrap into a grid; optional fixed column count' },
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
  /** Multi-series arrangement: auto | row | grid (default auto). */
  seriesLayout?: SeriesLayoutMode;
  /** Fixed columns when seriesLayout is grid (1–12). Ignored for auto/row. */
  seriesColumns?: number;
}

/**
 * Resolve multi-series grid columns.
 * auto: 1→1, 2→2, 3–4→2, 5–6→3, 7–9→3, else ceil(sqrt(n)).
 */
export function resolveSeriesColumns(
  seriesCount: number,
  seriesLayout: SeriesLayoutMode = 'auto',
  seriesColumns?: number,
): number {
  if (seriesCount <= 1) {
    return 1;
  }
  if (seriesLayout === 'row') {
    return seriesCount;
  }
  if (seriesLayout === 'grid' && seriesColumns !== undefined && seriesColumns !== null && seriesColumns >= 1) {
    return Math.min(12, Math.floor(seriesColumns));
  }
  // auto (and grid without columns)
  if (seriesCount <= 2) return seriesCount;
  if (seriesCount <= 4) return 2;
  if (seriesCount <= 6) return 3;
  if (seriesCount <= 9) return 3;
  return Math.ceil(Math.sqrt(seriesCount));
}

export interface StatChartSparklineOptions {
  color?: string;
  width?: number;
}

export type StatChartOptionsEditorProps = OptionsEditorProps<StatChartOptions>;

export function createInitialStatChartOptions(): StatChartOptions {
  return {
    calculation: 'last-number',
    format: {
      unit: 'decimal',
    },
    sparkline: {},
    legendMode: 'auto',
  };
}
