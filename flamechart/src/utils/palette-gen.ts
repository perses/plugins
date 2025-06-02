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

import { getConsistentColor } from './palette';

const LESS_THAN_ONE_COLOR = '#dee2e6'; // use this color when the value is less than 1
const NOT_FOUND_COLOR = '#393d47';

// color palette to display flame chart by total value
const valueColorPalette: string[] = [
  '#d95850',
  '#b5c334',
  '#ffb248',
  '#f2d643',
  '#fcce10',
  '#eb8146',
  '#ebdba4',
  '#8fd3e8',
  '#8fd3e8',
  '#59c0a3',
  '#1bca93',
];

/**
 * Get span color, account for whether palette is 'package-name' or 'value'
 */
export function getSpanColor(palette: string, functionName: string, value: number): string {
  if (palette === 'package-name') {
    return getPackageNamePaletteColor(functionName, value);
  }

  return getValuePaletteColor(value);
}

/**
 * Generate a consistent color for displaying flame chart by total value
 */
export function getValuePaletteColor(value: number): string {
  return value < 1 ? LESS_THAN_ONE_COLOR : valueColorPalette[Math.floor(value / 10)] || NOT_FOUND_COLOR;
}

/**
 * Generate a consistent span color for displaying flame chart by package-name
 * (if function name includes 'error', it will have a red hue).
 */
export function getPackageNamePaletteColor(functionName: string, value: number): string {
  // get package name from the function name.
  // It is the substring between the last '/' and the first '.' or the end of the string
  const packageName = functionName.split('/').pop()?.split('.')[0] || functionName;

  return value < 1 ? LESS_THAN_ONE_COLOR : getConsistentColor(packageName, packageName.toLowerCase().includes('error'));
}
