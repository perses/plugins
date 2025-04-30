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

import { Definition, FormatOptions, ThresholdOptions } from '@perses-dev/core';
import { OptionsEditorProps } from '@perses-dev/plugin-system';

export const DEFAULT_FORMAT: FormatOptions = { unit: 'decimal' };
export const DEFAULT_THRESHOLDS: ThresholdOptions = { defaultColor: '#56b4e9' };
export const DEFAULT_MIN_PERCENT = 0;
export const DEFAULT_MAX_PERCENT = 100;
export const DEFAULT_MIN_PERCENT_DECIMAL = 0;
export const DEFAULT_MAX_PERCENT_DECIMAL = 1;

/**
 * The schema for a HistogramChart panel.
 */
export interface HistogramChartDefinition extends Definition<HistogramChartOptions> {
  kind: 'HistogramChart';
}

/**
 * The Options object type supported by the HistogramChart panel plugin.
 */
export interface HistogramChartOptions {
  format?: FormatOptions;
  min?: number;
  max?: number;
  thresholds?: ThresholdOptions;
}

export type HistogramChartOptionsEditorProps = OptionsEditorProps<HistogramChartOptions>;

/**
 * Creates the initial/empty options for a HistogramChart panel.
 */
export function createInitialHistogramChartOptions(): HistogramChartOptions {
  return {
    format: DEFAULT_FORMAT,
  };
}
