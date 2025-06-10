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

import hsvToRgb from '@fantasy-color/hsv-to-rgb';
import { getConsistentColor } from './palette';

const LESS_THAN_ONE_COLOR = '#dee2e6'; // use this color when the value is less than 1
const NOT_FOUND_COLOR = '#393d47';
const GOLDEN_RATIO_CONJUGATE = 0.618033988749895;

// Generates n colors with a random hue and fixed saturation and value.
// The hue is generated using the golden ratio to have a good distribution of colors.
// If you want to learn more about it, please read the blog:
// https://martin.ankerl.com/2009/12/09/how-to-create-random-colors-programmatically/
export function generateColors(n: number): string[] {
  const result = [];
  for (let i = 0; i < n; i++) {
    let h = Math.random() + GOLDEN_RATIO_CONJUGATE; // We don't need a secure random number here.
    h %= 1; // Normalize the value to keep only the decimal value.
    const rgb = hsvToRgb({
      hue: h * 360, // Convert hue to degrees
      saturation: 50,
      value: 95,
    });
    result.push(`rgb(${rgb.red}, ${rgb.green}, ${rgb.blue})`);
  }
  return result;
}

// Palette of color to display the flame chart by value
const valueColorPalette: string[] = [
  '#fff85b',
  '#ffde4c',
  '#f08c00',
  '#ff8c00',
  '#ffc252',
  '#e67762',
  '#ff7070',
  '#834e56',
  '#ff6f00',
  '#ff004c',
  '#ff3300',
];

/**
 * Get span color, account for whether palette is 'package-name' or 'value'
 */
export function getSpanColor(palette: string, functionName: string, value: number): string {
  if (palette === 'package-name') {
    return getColorByPackageName(functionName, value);
  }

  return getColorByValue(value);
}

/**
 * Generate a consistent color for displaying flame chart by total value
 */
export function getColorByValue(value: number): string {
  if (value < 1) return LESS_THAN_ONE_COLOR;
  return valueColorPalette[Math.floor(value / (valueColorPalette.length - 1))] || NOT_FOUND_COLOR;
}

/**
 * Generate a consistent span color for displaying flame chart by package-name
 * (if function name includes 'error', it will have a red hue).
 */
export function getColorByPackageName(functionName: string, value: number): string {
  // get package name from the function name.
  // It is the substring between the last '/' and the first '.' or the end of the string
  const packageName = functionName.split('/').pop()?.split('.')[0] || functionName;

  return value < 1 ? LESS_THAN_ONE_COLOR : getConsistentColor(packageName, false);
}
