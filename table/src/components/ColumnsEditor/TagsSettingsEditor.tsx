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

import { Stack, TextField, Typography } from '@mui/material';
import { OptionsColorPicker, OptionsEditorControl, SettingsAutocomplete } from '@perses-dev/components';
import type { ReactElement } from 'react';

import type { TagsColorMode, TagsSettings } from '../../models';
import { DEFAULT_MANUAL_TAG_COLOR, normalizeHexColor } from '../../models/tag-colors';

const TAGS_COLOR_MODES: Array<{ id: TagsColorMode; label: string; description: string }> = [
  { id: 'auto', label: 'Auto', description: 'Color generated from the tag value, the same value keeps its color' },
  { id: 'palette', label: 'Palette', description: 'Color from the theme chart palette, picked from the tag value' },
  { id: 'manual', label: 'Manual', description: 'Every tag uses the default tag color' },
];

export interface TagsSettingsEditorProps {
  tags: TagsSettings;
  onChange: (tags: TagsSettings) => void;
}

/**
 * Editor controls of a column displayed as tags: delimiter, color mode and default tag color.
 */
export function TagsSettingsEditor({ tags, onChange }: TagsSettingsEditorProps): ReactElement {
  function handleDelimiterChange(delimiter: string): void {
    const { delimiter: _delimiter, ...rest } = tags;
    onChange(delimiter ? { ...rest, delimiter } : rest);
  }

  const colorMode = tags.colorMode ?? 'auto';

  function handleColorModeChange(newColorMode: TagsColorMode): void {
    if (newColorMode === colorMode) return;
    // defaultColor is only used by the manual color mode, auto is the default color mode
    const { colorMode: _colorMode, defaultColor, ...rest } = tags;
    if (newColorMode === 'auto') {
      onChange(rest);
    } else if (newColorMode === 'manual') {
      onChange(
        defaultColor ? { ...rest, colorMode: newColorMode, defaultColor } : { ...rest, colorMode: newColorMode },
      );
    } else {
      onChange({ ...rest, colorMode: newColorMode });
    }
  }

  function handleDefaultColorChange(color: string | undefined): void {
    const { defaultColor: _defaultColor, ...rest } = tags;
    if (color === undefined) {
      onChange(rest);
      return;
    }
    // The color picker accepts hex colors without the leading '#', which the schema rejects
    const defaultColor = normalizeHexColor(color);
    if (defaultColor) {
      onChange({ ...rest, defaultColor });
    }
  }

  return (
    <>
      <OptionsEditorControl
        label="Delimiter"
        control={
          <TextField
            size="small"
            placeholder="e.g. ,"
            value={tags.delimiter ?? ''}
            onChange={(e) => handleDelimiterChange(e.target.value)}
          />
        }
      />
      <OptionsEditorControl
        label="Color mode"
        control={
          <SettingsAutocomplete
            value={TAGS_COLOR_MODES.find((option) => option.id === colorMode)}
            options={TAGS_COLOR_MODES}
            onChange={(_, option) => handleColorModeChange(option.id)}
            disableClearable
          />
        }
      />
      <Typography variant="caption" color="text.secondary">
        Conditional Cell Format rules take priority over the color mode.
      </Typography>
      {tags.colorMode === 'manual' && (
        <OptionsEditorControl
          label="Default tag color"
          control={
            <Stack direction="row" justifyContent="flex-end">
              <OptionsColorPicker
                label="Default tag color"
                color={tags.defaultColor ?? DEFAULT_MANUAL_TAG_COLOR}
                onColorChange={(color) => handleDefaultColorChange(color)}
                onClear={tags.defaultColor ? () => handleDefaultColorChange(undefined) : undefined}
              />
            </Stack>
          }
        />
      )}
    </>
  );
}
