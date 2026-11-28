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

import { formatValue } from '@perses-dev/components';

import type { CellSettings, ColumnSettings } from './table-model';
import { evaluateCondition, formatCellDisplay, getMiscDefaultText } from './table-model';

export interface ResolvedTag {
  label: string;
  backgroundColor: string;
  /** When undefined, the renderer picks a readable contrast color. */
  textColor?: string;
}

/** Background color of the `manual` color mode when no default color is set (same as the AlertTable). */
export const DEFAULT_MANUAL_TAG_COLOR = '#9e9e9e';

// Hues below this value are reserved for error-like colors (reds), so automatic colors avoid them.
const ERROR_HUE_CUTOFF = 20;

/**
 * Generates a stable color from a string (same input => same color).
 * Ported from the AlertTable label colors (alertmanager plugin).
 */
export function hashStringToColor(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  hash = Math.abs(hash);

  const hue = ERROR_HUE_CUTOFF + (hash % (360 - ERROR_HUE_CUTOFF));
  const saturation = 55 + (hash % 25);
  const lightness = 45 + (hash % 15);
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

const HEX_COLOR_REGEX = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Normalizes a user-entered hex color to the `#rgb` / `#rrggbb` format accepted by the schema.
 * Adds the missing leading '#', returns undefined for anything else.
 */
export function normalizeHexColor(color: string): `#${string}` | undefined {
  const match = HEX_COLOR_REGEX.exec(color);
  return match ? `#${match[1]}` : undefined;
}

/**
 * Picks a stable color of the palette from a string (same input => same color).
 * Same algorithm as getConsistentCategoricalColor (timeserieschart plugin).
 * Returns undefined when the palette is empty.
 */
export function getPaletteColor(value: string, palette: string[]): string | undefined {
  if (palette.length === 0) return undefined;
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

function getUnmatchedTagColor(value: string, column: ColumnSettings, categoricalPalette: string[]): string {
  switch (column.tags?.colorMode) {
    case 'manual':
      return column.tags.defaultColor ?? DEFAULT_MANUAL_TAG_COLOR;
    case 'palette':
      return getPaletteColor(value, categoricalPalette) ?? hashStringToColor(value);
    default:
      return hashStringToColor(value);
  }
}

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * Splits a cell value into the values of its tags.
 * Without delimiter, the raw value is kept as a single tag (not stringified).
 */
export function splitTagValues(value: unknown, delimiter?: string): unknown[] {
  if (isEmptyValue(value)) return [];
  if (!delimiter) return [value];
  return String(value)
    .split(delimiter)
    .map((part) => part.trim())
    .filter((part) => part !== '');
}

/**
 * Returns the first matching column cell setting, otherwise the first matching global cell setting.
 */
export function findMatchingCellSetting(
  value: unknown,
  columnCellSettings: CellSettings[] | undefined,
  globalCellSettings: CellSettings[],
): CellSettings | undefined {
  return (
    columnCellSettings?.find((setting) => evaluateCondition(setting.condition, value)) ??
    globalCellSettings.find((setting) => evaluateCondition(setting.condition, value))
  );
}

function resolveTag(
  value: unknown,
  column: ColumnSettings,
  rule: CellSettings | undefined,
  categoricalPalette: string[],
): ResolvedTag {
  // Values coming from a split are strings: unit formatting only applies to single raw numeric values.
  const format = column.tags?.delimiter ? undefined : column.format;

  let label: string;
  if (rule) {
    // `text` is always set by formatCellDisplay, the fallback only satisfies the optional TableCellConfig.text type
    label = formatCellDisplay(value, rule, getMiscDefaultText(rule), format).text ?? String(value);
  } else if (typeof value === 'number' && format) {
    label = formatValue(value, format);
  } else {
    label = String(value);
  }

  return {
    label,
    backgroundColor: rule?.backgroundColor ?? getUnmatchedTagColor(String(value), column, categoricalPalette),
    textColor: rule?.textColor,
  };
}

/**
 * Resolves the tags (label and colors) to display for a cell value of a tag column.
 * Background precedence: column cell settings > global cell settings > color mode (auto, palette or manual).
 */
export function resolveTags(
  value: unknown,
  column: ColumnSettings,
  globalCellSettings: CellSettings[],
  categoricalPalette: string[] = [],
): ResolvedTag[] {
  if (isEmptyValue(value)) {
    const rule = findMatchingCellSetting(value, column.cellSettings, globalCellSettings);
    return rule ? [resolveTag(value, column, rule, categoricalPalette)] : [];
  }

  return splitTagValues(value, column.tags?.delimiter).map((part) =>
    resolveTag(
      part,
      column,
      findMatchingCellSetting(part, column.cellSettings, globalCellSettings),
      categoricalPalette,
    ),
  );
}
