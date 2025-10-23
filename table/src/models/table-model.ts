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

import { Definition, FormatOptions, Transform, UnknownSpec } from '@perses-dev/core';
import { TableDensity, TableCellConfig } from '@perses-dev/components';
import { OptionsEditorProps } from '@perses-dev/plugin-system';
import React from 'react';
import { TextField, Stack, MenuItem, Typography } from '@mui/material';

export interface ColumnSettings {
  name: string;

  // Text to display in the header for the column.
  header?: string;
  /**
   * Text to display when hovering over the header text. This can be useful for
   * providing additional information about the column when you want to keep the
   * header text relatively short to manage the column width.
   */
  headerDescription?: string;
  /**
   * Text to display when hovering over a cell. This can be useful for
   * providing additional information about the column when the content is
   * ellipsized to fit in the space.
   */
  cellDescription?: string;

  /**
   * Panel plugin to render.
   * By default, the cells are rendered as text.
   */
  plugin?: Definition<UnknownSpec>;

  /** Formatting options. Only applicable if plugin is unset. */
  format?: FormatOptions;

  // Alignment of the content in the cell.
  align?: 'left' | 'center' | 'right';

  // When `true`, the column will be sortable.
  enableSorting?: boolean;

  // Default sort order for the column.
  sort?: 'asc' | 'desc';

  /**
   * Width of the column when rendered in a table. It should be a number in pixels
   * or "auto" to allow the table to automatically adjust the width to fill
   * space.
   */
  width?: number | 'auto';
  // When `true`, the column will not be displayed.
  hide?: boolean;
  // Customize cell display based on their value for this specific column.
  cellSettings?: CellSettings[];
}

export interface ValueCondition {
  kind: 'Value';
  spec: {
    value: string;
  };
}

export interface RangeCondition {
  kind: 'Range';
  spec: {
    min?: number;
    max?: number;
  };
}

export interface RegexCondition {
  kind: 'Regex';
  spec: {
    expr: string;
  };
}

export interface MiscCondition {
  kind: 'Misc';
  spec: {
    value: 'empty' | 'null' | 'NaN' | 'true' | 'false';
  };
}

export type Condition = ValueCondition | RangeCondition | RegexCondition | MiscCondition;

export interface CellSettings {
  condition: Condition;
  text?: string;
  prefix?: string;
  suffix?: string;
  textColor?: `#${string}`;
  backgroundColor?: `#${string}`;
}

/**
 * The schema for a Table panel.
 */
export interface TableDefinition extends Definition<TableOptions> {
  kind: 'Table';
}

/**
 * The Options object type supported by the Table panel plugin.
 */
export interface TableOptions {
  // Change row height.
  density?: TableDensity;
  // When set to 'auto', the table will try to automatically adjust the width of columns to fit without overflowing.
  // Only for column without custom width specified in columnSettings.
  defaultColumnWidth?: 'auto' | number;
  // When set to 'auto', the table will calculate the cell height based on the line height of the theme and the density setting of the table.
  // Only for column without custom height specified in columnSettings.
  defaultColumnHeight?: 'auto' | number;
  // When true, columns are hidden by default unless specified in columnSettings.
  defaultColumnHidden?: boolean;
  // Enable pagination.
  pagination?: boolean;
  // Enable filtering for individual columns.
  enableFiltering?: boolean;
  // Customize column display and order them by their index in the array.
  columnSettings?: ColumnSettings[];
  // Customize cell display based on their value.
  cellSettings?: CellSettings[];
  // Apply transforms to the data before rendering the table.
  transforms?: Transform[];
}

/**
 * Creates the initial/empty options for a Table panel.
 */
export function createInitialTableOptions(): TableOptions {
  return {
    density: 'standard',
    enableFiltering: true,
  };
}

export type TableSettingsEditorProps = OptionsEditorProps<TableOptions>;

/**
 * Formats the display text and colors based on cell settings
 */
export function formatCellDisplay(value: unknown, setting: CellSettings, defaultText?: string): TableCellConfig {
  const baseText = setting.text || defaultText || String(value);
  const displayText = `${setting.prefix ?? ''}${baseText}${setting.suffix ?? ''}`;
  return {
    text: displayText,
    textColor: setting.textColor,
    backgroundColor: setting.backgroundColor,
  };
}

/**
 * Evaluates if a condition matches the given value
 */
export function evaluateCondition(condition: Condition, value: unknown): boolean {
  switch (condition.kind) {
    case 'Value':
      return condition.spec?.value === String(value);

    case 'Range': {
      if (Number.isNaN(Number(value))) return false;
      const numericValue = Number(value);

      // Both min and max defined
      if (condition.spec?.min !== undefined && condition.spec?.max !== undefined) {
        return numericValue >= +condition.spec.min && numericValue <= +condition.spec.max;
      }

      // Only min defined
      if (condition.spec?.min !== undefined) {
        return numericValue >= +condition.spec.min;
      }

      // Only max defined
      if (condition.spec?.max !== undefined) {
        return numericValue <= +condition.spec.max;
      }

      return false;
    }

    case 'Regex':
      if (!condition.spec?.expr) return false;
      try {
        const regex = new RegExp(condition.spec.expr);
        return regex.test(String(value));
      } catch {
        return false; // Invalid regex
      }

    case 'Misc':
      switch (condition.spec?.value) {
        case 'empty':
          return value === '';
        case 'null':
          return value === null || value === undefined;
        case 'NaN':
          return Number.isNaN(value);
        case 'true':
          return value === true;
        case 'false':
          return value === false;
        default:
          return false;
      }

    default:
      return false;
  }
}

/**
 * Evaluates all conditions and returns the cell config for the first matching condition
 */
export function evaluateConditionalFormatting(value: unknown, settings: CellSettings[]): TableCellConfig | undefined {
  for (const setting of settings) {
    if (evaluateCondition(setting.condition, value)) {
      // Handle special default text cases
      let defaultText: string | undefined;
      if (setting.condition.kind === 'Misc') {
        switch (setting.condition.spec?.value) {
          case 'null':
            defaultText = 'null';
            break;
          case 'NaN':
            defaultText = 'NaN';
            break;
        }
      }

      return formatCellDisplay(value, setting, defaultText);
    }
  }

  return undefined; // No conditions matched
}

/**
 * Renders the condition editor component for a given condition
 * This function can be used by both CellEditor and ColumnEditor to maintain consistency
 */
export function renderConditionEditor(
  condition: Condition,
  onChange: (condition: Condition) => void,
  size: 'small' | 'medium' = 'small'
): React.ReactElement | null {
  if (condition.kind === 'Value') {
    return React.createElement(TextField, {
      label: 'Value',
      placeholder: 'Exact value',
      value: condition.spec?.value ?? '',
      onChange: (e: { target: { value: string } }) =>
        onChange({ ...condition, spec: { value: e.target.value } } as ValueCondition),
      fullWidth: true,
      size: size,
    });
  } else if (condition.kind === 'Range') {
    return React.createElement(
      Stack,
      {
        gap: 1,
        direction: 'row',
      },
      [
        React.createElement(TextField, {
          key: 'min',
          label: 'From',
          placeholder: 'Start of range',
          value: condition.spec?.min ?? '',
          onChange: (e: { target: { value: string } }) =>
            onChange({ ...condition, spec: { ...condition.spec, min: +e.target.value } } as RangeCondition),
          fullWidth: true,
          size: size,
        }),
        React.createElement(TextField, {
          key: 'max',
          label: 'To',
          placeholder: 'End of range (inclusive)',
          value: condition.spec?.max ?? '',
          onChange: (e: { target: { value: string } }) =>
            onChange({ ...condition, spec: { ...condition.spec, max: +e.target.value } } as RangeCondition),
          fullWidth: true,
          size: size,
        }),
      ]
    );
  } else if (condition.kind === 'Regex') {
    return React.createElement(TextField, {
      label: 'Regular Expression',
      placeholder: 'JavaScript regular expression',
      value: condition.spec?.expr ?? '',
      onChange: (e: { target: { value: string } }) =>
        onChange({ ...condition, spec: { expr: e.target.value } } as RegexCondition),
      fullWidth: true,
      size: size,
    });
  } else if (condition.kind === 'Misc') {
    const options = [
      { value: 'empty', label: 'Empty', caption: 'Matches empty string' },
      { value: 'null', label: 'Null', caption: 'Matches null or undefined' },
      { value: 'NaN', label: 'NaN', caption: 'Matches Not a Number value' },
      { value: 'true', label: 'True', caption: 'Matches true boolean' },
      { value: 'false', label: 'False', caption: 'Matches false boolean' },
    ];

    return React.createElement(
      TextField,
      {
        select: true,
        label: 'Value',
        value: condition.spec?.value ?? '',
        onChange: (e: { target: { value: string } }) =>
          onChange({ ...condition, spec: { value: e.target.value } } as MiscCondition),
        fullWidth: true,
        size: size,
      },
      options.map((option) =>
        React.createElement(
          MenuItem,
          {
            key: option.value,
            value: option.value,
          },
          React.createElement(Stack, { key: 'stack' }, [
            React.createElement(Typography, { key: 'title' }, option.label),
            React.createElement(
              Typography,
              {
                key: 'caption',
                variant: 'caption',
              },
              option.caption
            ),
          ])
        )
      )
    );
  }
  return null;
}
