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

import { FontSizeOption, FormatOptions, ThresholdOptions, ValueMapping } from '@perses-dev/components';
import { CalculationType, OptionsEditorProps } from '@perses-dev/plugin-system';
import { Definition } from '@perses-dev/spec';

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

export interface StatChartOptions {
  calculation: CalculationType;
  format: FormatOptions;
  metricLabel?: string;
  thresholds?: ThresholdOptions;
  sparkline?: StatChartSparklineOptions;
  valueFontSize?: FontSizeOption;
  mappings?: ValueMapping[];
  colorMode?: ColorMode;
  legendMode?: legendMode;
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

/**
 * Only `last` reproduces exactly from a single instant point: it is the most
 * recent value of the series, which is precisely what an instant query returns.
 *
 * Everything else needs the full series and must stay a range query:
 *  - `mean`, `sum`, `min`, `max` aggregate over every point;
 *  - `first` / `first-number` need the start of the window, not the latest point;
 *  - `last-number` is the last *non-null* value, so with a trailing null it has to
 *    look back past the latest point, which an instant query cannot see.
 */
const INSTANT_SAFE_CALCULATIONS: ReadonlySet<CalculationType> = new Set<CalculationType>(['last']);

/**
 * A stat panel usually shows a single aggregate value, for which an instant query
 * is enough and much cheaper than a range query — especially against backends that
 * split range queries into many sub-queries.
 *
 * It cannot always be instant though:
 *  - the sparkline draws the series itself, so it needs the range data;
 *  - calculations other than `last` aggregate over the series and would silently
 *    collapse to a single point.
 *
 * Requesting instant unconditionally breaks both (see perses/plugins#738, which was
 * reverted for the sparkline case), so the mode is derived from the spec.
 */
export function getStatChartQueryMode(spec: StatChartOptions): 'instant' | 'range' {
  if (spec.sparkline !== undefined) return 'range';
  return INSTANT_SAFE_CALCULATIONS.has(spec.calculation) ? 'instant' : 'range';
}

export function getStatChartQueryOptions(spec: StatChartOptions): { mode: 'instant' | 'range' } {
  return { mode: getStatChartQueryMode(spec) };
}
