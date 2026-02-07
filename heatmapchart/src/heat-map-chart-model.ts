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

import { Definition, FormatOptions } from '@perses-dev/core';
import { OptionsEditorProps } from '@perses-dev/plugin-system';

export const DEFAULT_FORMAT: FormatOptions = { unit: 'decimal' };
export const DEFAULT_MIN_PERCENT = 0;
export const DEFAULT_MAX_PERCENT = 100;
export const DEFAULT_MIN_PERCENT_DECIMAL = 0;
export const DEFAULT_MAX_PERCENT_DECIMAL = 1;

export type LOG_BASE = undefined | 2 | 10;

export const LOG_BASE_CONFIG: Record<string, { label: string; log: LOG_BASE }> = {
  none: { label: 'None', log: undefined },
  '2': { label: '2', log: 2 },
  '10': { label: '10', log: 10 },
};

export const LOG_BASE_OPTIONS = Object.entries(LOG_BASE_CONFIG).map(([id, config]) => ({
  id: id as string,
  ...config,
}));

/**
 * The schema for a HeatMapChart panel.
 */
export interface HeatMapChartDefinition extends Definition<HeatMapChartOptions> {
  kind: 'HeatMapChart';
}

/**
 * The Options object type supported by the HeatMapChart panel plugin.
 */
export interface HeatMapChartOptions {
  yAxisFormat?: FormatOptions;
  countFormat?: FormatOptions;
  showVisualMap?: boolean;
  logBase?: LOG_BASE;
}

export type HeatMapChartOptionsEditorProps = OptionsEditorProps<HeatMapChartOptions>;

/**
 * Creates the initial/empty options for a HeatMapChart panel.
 */
export function createInitialHeatMapChartOptions(): HeatMapChartOptions {
  return {
    yAxisFormat: DEFAULT_FORMAT,
    countFormat: DEFAULT_FORMAT,
    showVisualMap: true,
  };
}
