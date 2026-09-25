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

import type { QuerySettingsOptions, TimeSeriesChartVisualOptions } from '../time-series-chart-model';
import { CATEGORICAL_PALETTE_SCHEMES } from '../time-series-chart-model';
import { getConsistentColor } from './palette';

export interface SeriesColorProps {
  defaultCategoricalPalette: string[];
  visual: TimeSeriesChartVisualOptions;
  muiPrimaryColor: string;
  seriesName: string;
  seriesIndex: number;
  querySettings?: QuerySettingsOptions;
  queryHasMultipleResults?: boolean;
}

/**
 * Get line color as well as color for tooltip and legend, account for whether palette is 'categorical' or 'auto' aka generative
 */
export function getSeriesColor(props: SeriesColorProps): string {
  const {
    defaultCategoricalPalette,
    visual,
    muiPrimaryColor,
    seriesName,
    seriesIndex,
    querySettings,
    queryHasMultipleResults,
  } = props;

  // Use color overrides defined in query settings in priority, if applicable
  if (querySettings) {
    if (querySettings.colorMode === 'fixed' && querySettings.colorValue) {
      return querySettings.colorValue;
    } else if (querySettings.colorMode === 'fixed-single' && !queryHasMultipleResults && querySettings.colorValue) {
      return querySettings.colorValue;
    }
  }

  // Fallback is unlikely to set unless echarts theme palette in charts theme provider is undefined.
  const fallbackColor =
    Array.isArray(defaultCategoricalPalette) && defaultCategoricalPalette[0]
      ? (defaultCategoricalPalette[0] as string) // Needed since echarts color property isn't always an array.
      : muiPrimaryColor;

  // Explicit way to always cycle through classical palette instead of changing when based on number of series.
  if (visual.palette?.mode === 'categorical') {
    const schemeName = visual.palette.categoricalPaletteName;
    const scheme = schemeName ? CATEGORICAL_PALETTE_SCHEMES[schemeName] : null;
    const palette = scheme && scheme.length > 0 ? scheme : defaultCategoricalPalette;
    if (palette && palette.length > 0) {
      return getCategoricalPaletteColor(palette, seriesIndex, fallbackColor);
    }
  }

  return getAutoPaletteColor(seriesName, fallbackColor);
}

/**
 * Get color from generative color palette, this approaches uses series name as the seed and
 * allows for consistent colors across panels (when all panels use this approach).
 */
export function getAutoPaletteColor(name: string, fallbackColor: string): string {
  // corresponds to 'Auto' in palette.kind for generative color palette
  const generatedColor = getConsistentSeriesNameColor(name);
  return generatedColor ?? fallbackColor;
}

/**
 * Default classical qualitative palette that cycles through the colors array by index.
 */
export function getCategoricalPaletteColor(
  palette: readonly string[],
  seriesIndex: number,
  fallbackColor: string,
): string {
  if (!palette || palette.length === 0) {
    return fallbackColor;
  }
  // Loop through predefined static color palette
  const paletteIndex = seriesIndex % palette.length;
  // fallback color comes from echarts theme
  return palette[paletteIndex] ?? fallbackColor;
}

/*
 * Generate a consistent series name color (if series name includes 'error', it will have a red hue).
 */
export function getConsistentSeriesNameColor(inputString: string): string {
  return getConsistentColor(inputString, inputString.toLowerCase().includes('error'));
}
