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

import type { FormatOptions, ModeOption, SortOption } from '@perses-dev/components';
import type { CalculationType, LegendSpecOptions, OptionsEditorProps } from '@perses-dev/plugin-system';
import { DEFAULT_CALCULATION } from '@perses-dev/plugin-system';
import type { Definition } from '@perses-dev/spec';

export const DEFAULT_FORMAT: FormatOptions = { unit: 'decimal', shortValues: true };
export const DEFAULT_SORT: SortOption = 'desc';
export const DEFAULT_MODE: ModeOption = 'value';
export const DEFAULT_OUTER_RADIUS = 100;

/** Visual settings that control the pie chart's size and colors. */
export interface PieChartVisualOptions {
  /** Inner radius as a whole percentage from 0 to 100. When omitted, the chart renders as a pie. */
  innerRadius?: number;
  /** Outer radius as a whole percentage from 0 to 100. */
  outerRadius: number;
  /** Colors used for the pie chart segments. */
  colorPalette?: string[];
}

export const DEFAULT_VISUAL: PieChartVisualOptions = {
  outerRadius: DEFAULT_OUTER_RADIUS,
};

export interface BarChartDefinition extends Definition<PieChartOptions> {
  kind: 'PieChart';
}

export interface PieChartOptions {
  calculation: CalculationType;
  format?: FormatOptions;
  legend?: LegendSpecOptions;
  mode?: ModeOption;
  showLabels?: boolean;
  sort?: SortOption;
  visual?: PieChartVisualOptions;
  /** @deprecated Use visual.colorPalette. */
  colorPalette?: string[];
  /** @deprecated Retained when reading persisted charts; visual.outerRadius controls the rendered radius. */
  radius?: number;
}

export type PieChartOptionsEditorProps = OptionsEditorProps<PieChartOptions>;

export function createInitialPieChartOptions(): PieChartOptions {
  return {
    calculation: DEFAULT_CALCULATION,
    format: DEFAULT_FORMAT,
    mode: DEFAULT_MODE,
    showLabels: false,
    sort: DEFAULT_SORT,
    visual: { ...DEFAULT_VISUAL },
  };
}

export function resolvePieChartVisualOptions(options: PieChartOptions): PieChartVisualOptions {
  return {
    innerRadius: options.visual?.innerRadius,
    outerRadius: options.visual?.outerRadius ?? DEFAULT_OUTER_RADIUS,
    colorPalette: options.visual?.colorPalette ?? options.colorPalette,
  };
}
