// Copyright 2024 The Perses Authors
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

import { ModeOption, SortOption } from '@perses-dev/components';
import { CalculationType, DEFAULT_CALCULATION, Definition, FormatOptions } from '@perses-dev/core';
import { LegendSpecOptions, OptionsEditorProps } from '@perses-dev/plugin-system';

export const DEFAULT_FORMAT: FormatOptions = { unit: 'decimal', shortValues: true };
export const DEFAULT_SORT: SortOption = 'desc';
export const DEFAULT_MODE: ModeOption = 'value';

export interface BarChartDefinition extends Definition<PieChartOptions> {
  kind: 'PieChart';
}

export interface PieChartOptions {
  calculation: CalculationType;
  format?: FormatOptions;
  colorPalette?: string[];
  legend?: LegendSpecOptions;
  mode?: ModeOption;
  radius: number;
  showLabels?: boolean;
  sort?: SortOption;
}

export type PieChartOptionsEditorProps = OptionsEditorProps<PieChartOptions>;

export function createInitialPieChartOptions(): PieChartOptions {
  return {
    calculation: DEFAULT_CALCULATION,
    format: DEFAULT_FORMAT,
    mode: DEFAULT_MODE,
    radius: 50,
    showLabels: false,
    sort: DEFAULT_SORT,
  };
}
