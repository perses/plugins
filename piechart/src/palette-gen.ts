// Copyright 2023 The Perses Authors
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

import { getConsistentColor } from './palette';

export interface SeriesColorProps {
  categoricalPalette: string[];
  muiPrimaryColor: string;
  seriesName: string;
}

/**
 * Get line color as well as color for tooltip and legend, account for whether palette is 'categorical' or 'auto' aka generative
 */
export function getSeriesColor(props: SeriesColorProps): string {
  const { categoricalPalette, muiPrimaryColor, seriesName } = props;

  // Fallback is unlikely to set unless echarts theme palette in charts theme provider is undefined.
  const fallbackColor =
    Array.isArray(categoricalPalette) && categoricalPalette[0]
      ? (categoricalPalette[0] as string) // Needed since echarts color property isn't always an array.
      : muiPrimaryColor;

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
export function getCategoricalPaletteColor(palette: string[], seriesIndex: number, fallbackColor: string): string {
  if (palette === undefined) {
    return fallbackColor;
  }
  // Loop through predefined static color palette
  const paletteTotalColors = palette.length ?? 1;
  const paletteIndex = seriesIndex % paletteTotalColors;
  // fallback color comes from echarts theme
  const seriesColor = palette[paletteIndex] ?? fallbackColor;
  return seriesColor;
}

/*
 * Generate a consistent series name color (if series name includes 'error', it will have a red hue).
 */
export function getConsistentSeriesNameColor(inputString: string): string {
  return getConsistentColor(inputString, inputString.toLowerCase().includes('error'));
}
