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

import { Button, ButtonGroup, Stack, TextField } from '@mui/material';
import { OptionsColorPicker, OptionsEditorControl } from '@perses-dev/components';
import type { ReactElement } from 'react';

import type { TagsColorMode, TagsSettings } from '../../models';
import { DEFAULT_MANUAL_TAG_COLOR, normalizeHexColor } from '../../models/tag-colors';

const TAGS_COLOR_MODES: Array<{ mode: TagsColorMode; label: string }> = [
  { mode: 'auto', label: 'Auto' },
  { mode: 'palette', label: 'Palette' },
  { mode: 'manual', label: 'Manual' },
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

  function handleColorModeChange(colorMode: TagsColorMode): void {
    // defaultColor is only used by the manual color mode, auto is the default color mode
    const { colorMode: _colorMode, defaultColor, ...rest } = tags;
    if (colorMode === 'auto') {
      onChange(rest);
    } else if (colorMode === 'manual') {
      onChange(defaultColor ? { ...rest, colorMode, defaultColor } : { ...rest, colorMode });
    } else {
      onChange({ ...rest, colorMode });
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
          // Wrapped so the buttons keep their own accessible names
          <Stack direction="row" justifyContent="flex-end">
            <ButtonGroup aria-label="Color mode" size="small">
              {TAGS_COLOR_MODES.map(({ mode, label }) => (
                <Button
                  key={mode}
                  variant={(tags.colorMode ?? 'auto') === mode ? 'contained' : 'outlined'}
                  onClick={() => handleColorModeChange(mode)}
                >
                  {label}
                </Button>
              ))}
            </ButtonGroup>
          </Stack>
        }
      />
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
