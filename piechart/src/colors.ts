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
export function getSeriesColor(totalSeries: number, colorPalette: string[]): string[] {
  if (totalSeries <= 0) {
    return [];
  }

  const colors: string[] = [];

  // Special case: single color palette - generate gradients from that color
  if (colorPalette.length === 1 || !colorPalette || colorPalette.length === 0) {
    const baseColor = colorPalette[0] ?? '#555555';
    for (let i = 0; i < totalSeries; i++) {
      if (i === 0) {
        colors.push(baseColor);
      } else {
        const gradientFactor = 1 * ((totalSeries - i) / totalSeries);
        colors.push(generateGradientColor(baseColor, gradientFactor));
      }
    }
    return colors.sort(() => Math.random() - 0.5);
  }

  for (let i = 0; i < totalSeries; i++) {
    const color = getColor(colorPalette, i);
    colors.push(color);
  }

  return colors.sort(() => Math.random() - 0.5);
}

/**
 * Default classical qualitative palette that cycles through the colors array by index.
 * When colors start repeating (after exhausting the palette), applies gradients for distinction.
 */
export function getColor(palette: string[], seriesIndex: number): string {
  // Handle undefined or empty palette
  if (!palette || palette.length === 0) {
    return '#555555';
  }

  const paletteTotalColors = palette.length;
  const paletteIndex = seriesIndex % paletteTotalColors;
  const baseColor = palette[paletteIndex] ?? '#555555';

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
