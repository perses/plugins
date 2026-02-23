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

import { FontSizeOption } from '@perses-dev/components';
import { CalculationType, Definition, FormatOptions, ThresholdOptions, ValueMapping } from '@perses-dev/core';
import { OptionsEditorProps } from '@perses-dev/plugin-system';

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

export type TextMode = 'auto' | 'value' | 'name' | 'none' | 'value_and_name';

export type TextModeLabelItem = {
  id: TextMode;
  label: string;
  description?: string;
};

export const TEXT_MODE_LABELS: TextModeLabelItem[] = [
  { id: 'auto', label: 'Auto', description: 'Show value by default, or value and name when label is present' },
  { id: 'value', label: 'Value', description: 'Show only the calculated value' },
  { id: 'name', label: 'Name', description: 'Show only the series name' },
  { id: 'value_and_name', label: 'Value and name', description: 'Show both value and name' },
  { id: 'none', label: 'None', description: 'Show nothing (empty)' },
];

export interface StatChartOptions {
  calculation: CalculationType;
  textMode?: TextMode;
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
    textMode: 'auto',
  };
}
