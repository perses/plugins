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

import ColorHash from 'color-hash';

// Valid hue values are 0 to 360 and can be adjusted to control the generated colors.
// More info: https://github.com/zenozeng/color-hash#custom-hue
// Picked min of 20 and max of 360 to exclude common threshold colors (red).
// Items with "error" in them will always be generated as red.
const ERROR_HUE_CUTOFF = 20;
const colorGenerator = new ColorHash({ hue: { min: ERROR_HUE_CUTOFF, max: 360 } });
const redColorGenerator = new ColorHash({ hue: { min: 0, max: ERROR_HUE_CUTOFF } });

export interface SeriesColorProps {
  categoricalPalette: string[];
  muiPrimaryColor: string;
  seriesName: string;
}

// Color utility functions
/**
 * Converts a number to a 2-digit hex string
 */
function toHex(n: number): string {
  const hex = n.toString(16);
  return hex.length === 1 ? '0' + hex : hex;
}

/**
 * Converts a hex color string to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  return {
    r: parseInt(cleanHex.substring(0, 2), 16),
    g: parseInt(cleanHex.substring(2, 4), 16),
    b: parseInt(cleanHex.substring(4, 6), 16),
  };
}

/**
 * Returns a deterministic number between 0 and 1 for a given string
 */
function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to positive number and normalize to 0-1 range
  return Math.abs(hash) / 2147483647;
}

/**
 * Helper function to generate gradient colors for series within a query
 */
export function generateGradientColor(baseColor: string, factor: number): string {
  // Convert hex color to RGB
  const { r, g, b } = hexToRgb(baseColor);

  const newR = Math.round(r * factor);
  const newG = Math.round(g * factor);
  const newB = Math.round(b * factor);

  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

/**
 * Generates a list of color strings for a given number of series using a categorical palette.
 * When the number of series exceeds the palette size, it cycles through the palette
 * and applies gradients to create visual distinction.
 * @param totalSeries - The total number of series that need colors
 * @param colorPalette - Array of color strings to use as the base palette
 * @returns Array of color strings, one for each series
 */
export function getSeriesColor(seriesNames: string[], colorPalette?: string[]): string[] {
  const totalSeries = seriesNames.length;

  if (totalSeries <= 0) {
    return [];
  }

  const colors: string[] = [];

  // undefined palette - default
  if (colorPalette === undefined) {
    for (let nameIndex = 0; nameIndex < seriesNames.length; nameIndex++) {
      const seriesColor = getDefaultSeriesColor({
        categoricalPalette: ['#ff0000'],
        muiPrimaryColor: '#ff0000',
        seriesName: seriesNames[nameIndex] || '',
      });
      colors.push(seriesColor);
    }
    return colors;
  }

  // single color palette - generate gradients from that color
  if (colorPalette.length === 1) {
    const baseColor = colorPalette[0] ?? '#ff0000';
    for (let i = 0; i < totalSeries; i++) {
      if (i === 0) {
        colors.push(baseColor);
      } else {
        const gradientFactor = 1 * ((totalSeries - i) / totalSeries);
        colors.push(generateGradientColor(baseColor, gradientFactor));
      }
    }
    return colors.sort((a, b) => {
      const seedA = stringToSeed(seriesNames[colors.indexOf(a)] || 'fallback');
      const seedB = stringToSeed(seriesNames[colors.indexOf(b)] || 'fallback');
      return seedA - seedB;
    });
  }

  // multi color palette - loops through colors and adds gradient when palette is exhausted
  for (let i = 0; i < totalSeries; i++) {
    const color = getColor(colorPalette, i);
    colors.push(color);
  }

  if (totalSeries > colorPalette.length) {
    return colors.sort((a, b) => {
      const seedA = stringToSeed(seriesNames[colors.indexOf(a)] || 'fallback');
      const seedB = stringToSeed(seriesNames[colors.indexOf(b)] || 'fallback');
      return seedA - seedB;
    });
  }
  return colors;
}

/**
 * Default classical qualitative palette that cycles through the colors array by index.
 * When colors start repeating (after exhausting the palette), applies gradients for distinction.
 */
export function getColor(palette: string[], seriesIndex: number): string {
  // Handle undefined or empty palette
  if (!palette || palette.length === 0) {
    return '#ff0000';
  }

  const paletteTotalColors = palette.length;
  const paletteIndex = seriesIndex % paletteTotalColors;
  const baseColor = palette[paletteIndex] ?? '#ff0000';

  // If we haven't exhausted the palette yet, use the original color
  if (seriesIndex < paletteTotalColors) {
    return baseColor;
  }

  // Calculate which "cycle" we're in (0 = first repeat, 1 = second repeat, etc.)
  const cycleNumber = Math.floor(seriesIndex / paletteTotalColors);

  // Apply gradient based on cycle number to create visual distinction
  const gradientFactor = Math.min(1 - cycleNumber * 0.2, 1);
  return generateGradientColor(baseColor, gradientFactor);
}

function computeConsistentColor(name: string, error: boolean): string {
  const [hue, saturation, lightness] = error ? redColorGenerator.hsl(name) : colorGenerator.hsl(name);
  const saturationPercent = `${(saturation * 100).toFixed(0)}%`;
  const lightnessPercent = `${(lightness * 100).toFixed(0)}%`;
  return `hsla(${hue.toFixed(2)},${saturationPercent},${lightnessPercent},0.9)`;
}

// To check whether a color has already been generated for a given string.
// TODO: Predefined color aliases will be defined here
const colorLookup: Record<string, string> = {};

/**
 * Return a consistent color for (name, error) tuple
 */
export function getConsistentColor(name: string, error: boolean): string {
  const key = `${name}_____${error}`;
  let value = colorLookup[key];
  if (!value) {
    value = computeConsistentColor(name, error);
    colorLookup[key] = value;
  }
  return value;
}

/*
 * Generate a consistent series name color (if series name includes 'error', it will have a red hue).
 */
export function getConsistentSeriesNameColor(inputString: string): string {
  return getConsistentColor(inputString, inputString.toLowerCase().includes('error'));
}

/**
 * Get line color as well as color for tooltip and legend, account for whether palette is 'categorical' or 'auto' aka generative
 */
export function getDefaultSeriesColor(props: SeriesColorProps): string {
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
