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

import type { StackProps } from '@mui/material';
import { Button, ButtonGroup, Stack, Switch, TextField, Typography } from '@mui/material';
import type { FormatOptions } from '@perses-dev/components';
import {
  AlignSelector,
  FormatControls,
  OptionsEditorColumn,
  OptionsEditorControl,
  OptionsEditorGrid,
  OptionsColorPicker,
  OptionsEditorGroup,
  SortSelectorButtons,
} from '@perses-dev/components';
import { PluginKindSelect } from '@perses-dev/plugin-system';
import type { ReactElement } from 'react';
import { useState } from 'react';

import type { ColumnSettings, TagsColorMode, TagsSettings } from '../../models';
import { DEFAULT_MANUAL_TAG_COLOR, normalizeHexColor } from '../../models/tag-colors';
import { ConditionalPanel } from '../ConditionalPanel';
import { DataLinkEditor } from './DataLinkEditorDialog';
import { EmbeddedPanelOptionsEditor } from './EmbeddedPanelOptionsEditor';

const DEFAULT_FORMAT: FormatOptions = {
  unit: 'decimal',
  shortValues: true,
};

const TAGS_COLOR_MODES: Array<{ mode: TagsColorMode; label: string }> = [
  { mode: 'auto', label: 'Auto' },
  { mode: 'palette', label: 'Palette' },
  { mode: 'manual', label: 'Manual' },
];

type CellDisplayMode = 'text' | 'tags' | 'visualization';

function getCellDisplayMode(column: ColumnSettings): CellDisplayMode {
  if (column.plugin) return 'visualization';
  if (column.tags) return 'tags';
  return 'text';
}

const CELL_DISPLAY_CAPTIONS: Record<CellDisplayMode, string> = {
  text: 'Visualizations reuse panel settings (thresholds, units, colors). Text mode uses value formatting below.',
  visualization:
    'Visualizations reuse panel settings (thresholds, units, colors). Text mode uses value formatting below.',
  tags: 'Conditional Cell Format rules color each tag. Tags that match no rule are colored from their value (Auto), from the theme palette (Palette), or with the default tag color (Manual).',
};

type OmittedMuiProps = 'children' | 'value' | 'onChange';

export interface ColumnEditorProps extends Omit<StackProps, OmittedMuiProps> {
  column: ColumnSettings;
  onChange: (column: ColumnSettings) => void;
  defaultEnableSorting?: boolean;
}

export function ColumnEditor({
  column,
  onChange,
  defaultEnableSorting = false,
  ...others
}: ColumnEditorProps): ReactElement {
  const [width, setWidth] = useState<number>(
    column.width === undefined || column.width === 'auto' ? 100 : column.width,
  );

  const enableSorting = column.enableSorting ?? defaultEnableSorting;

  function handleEnableSortingChange(checked: boolean): void {
    if (checked === defaultEnableSorting) {
      const { enableSorting: _ignored, ...rest } = column;
      onChange(rest);
      return;
    }
    onChange({ ...column, enableSorting: checked });
  }

  const displayMode = getCellDisplayMode(column);

  function handleDisplayModeChange(mode: CellDisplayMode): void {
    const { plugin: _plugin, tags: _tags, ...rest } = column;
    switch (mode) {
      case 'text':
        onChange(rest);
        break;
      case 'tags':
        onChange({ ...rest, tags: column.tags ?? {} });
        break;
      case 'visualization':
        onChange({ ...rest, plugin: { kind: 'GaugeChart', spec: {} } });
        break;
    }
  }

  function handleTagsChange(tags: TagsSettings): void {
    onChange({ ...column, tags });
  }

  function handleDelimiterChange(delimiter: string): void {
    const { delimiter: _delimiter, ...rest } = column.tags ?? {};
    handleTagsChange(delimiter ? { ...rest, delimiter } : rest);
  }

  function handleColorModeChange(colorMode: TagsColorMode): void {
    // defaultColor is only used by the manual color mode, auto is the default color mode
    const { colorMode: _colorMode, defaultColor, ...rest } = column.tags ?? {};
    if (colorMode === 'auto') {
      handleTagsChange(rest);
    } else if (colorMode === 'manual') {
      handleTagsChange(defaultColor ? { ...rest, colorMode, defaultColor } : { ...rest, colorMode });
    } else {
      handleTagsChange({ ...rest, colorMode });
    }
  }

  function handleDefaultColorChange(color: string | undefined): void {
    const { defaultColor: _defaultColor, ...rest } = column.tags ?? {};
    if (color === undefined) {
      handleTagsChange(rest);
      return;
    }
    // The color picker accepts hex colors without the leading '#', which the schema rejects
    const defaultColor = normalizeHexColor(color);
    if (defaultColor) {
      handleTagsChange({ ...rest, defaultColor });
    }
  }

  return (
    <Stack {...others}>
      <OptionsEditorGrid>
        <OptionsEditorColumn>
          <OptionsEditorGroup title="Column">
            <OptionsEditorControl
              label="Name*"
              control={
                <TextField
                  value={column.name}
                  onChange={(e) => onChange({ ...column, name: e.target.value })}
                  required
                />
              }
            />
            <OptionsEditorControl
              label="Header"
              control={
                <TextField
                  value={column.header ?? ''}
                  onChange={(e) => onChange({ ...column, header: e.target.value ? e.target.value : undefined })}
                />
              }
            />
            <OptionsEditorControl
              label="Header Tooltip"
              control={
                <TextField
                  value={column.headerDescription ?? ''}
                  onChange={(e) =>
                    onChange({ ...column, headerDescription: e.target.value ? e.target.value : undefined })
                  }
                />
              }
            />
            <OptionsEditorControl
              label="Cell Tooltip"
              control={
                <TextField
                  value={column.cellDescription ?? ''}
                  onChange={(e) =>
                    onChange({ ...column, cellDescription: e.target.value ? e.target.value : undefined })
                  }
                />
              }
            />
            <OptionsEditorControl
              label="Enable sorting"
              control={<Switch checked={enableSorting} onChange={(e) => handleEnableSortingChange(e.target.checked)} />}
            />
            {column.enableSorting === undefined && (
              <Typography variant="caption" color="text.secondary">
                Inherits from General Settings
              </Typography>
            )}
            {enableSorting && (
              <OptionsEditorControl
                label="Default Sort"
                control={
                  <SortSelectorButtons
                    size="medium"
                    value={column.sort}
                    sx={{
                      margin: 0.5,
                    }}
                    onChange={(sort) => onChange({ ...column, sort: sort })}
                  />
                }
              />
            )}
          </OptionsEditorGroup>
        </OptionsEditorColumn>

        <OptionsEditorColumn>
          <OptionsEditorGroup title="Visual">
            <OptionsEditorControl
              label="Show column"
              control={
                <Switch
                  checked={!(column.hide ?? false)}
                  onChange={(e) => onChange({ ...column, hide: !e.target.checked })}
                />
              }
            />
            <OptionsEditorControl
              label="Cell display"
              control={
                <Stack spacing={1}>
                  <ButtonGroup aria-label="Cell display" size="small">
                    <Button
                      variant={displayMode === 'text' ? 'contained' : 'outlined'}
                      onClick={() => handleDisplayModeChange('text')}
                    >
                      Text
                    </Button>
                    <Button
                      variant={displayMode === 'tags' ? 'contained' : 'outlined'}
                      onClick={() => handleDisplayModeChange('tags')}
                    >
                      Tags
                    </Button>
                    <Button
                      variant={displayMode === 'visualization' ? 'contained' : 'outlined'}
                      onClick={() => handleDisplayModeChange('visualization')}
                    >
                      Visualization
                    </Button>
                  </ButtonGroup>
                  <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 360 }}>
                    {CELL_DISPLAY_CAPTIONS[displayMode]}
                  </Typography>
                </Stack>
              }
            />
            {column.plugin ? (
              <OptionsEditorControl
                label="Visualization type"
                control={
                  <PluginKindSelect
                    pluginTypes={['Panel']}
                    size="small"
                    value={{ type: 'Panel', kind: column.plugin.kind }}
                    onChange={(event) => onChange({ ...column, plugin: { kind: event.kind, spec: {} } })}
                  />
                }
              />
            ) : (
              <>
                {column.tags && (
                  <>
                    <OptionsEditorControl
                      label="Delimiter"
                      control={
                        <TextField
                          size="small"
                          placeholder="e.g. ,"
                          value={column.tags.delimiter ?? ''}
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
                                variant={(column.tags?.colorMode ?? 'auto') === mode ? 'contained' : 'outlined'}
                                onClick={() => handleColorModeChange(mode)}
                              >
                                {label}
                              </Button>
                            ))}
                          </ButtonGroup>
                        </Stack>
                      }
                    />
                    {column.tags.colorMode === 'manual' && (
                      <OptionsEditorControl
                        label="Default tag color"
                        control={
                          <Stack direction="row" justifyContent="flex-end">
                            <OptionsColorPicker
                              label="Default tag color"
                              color={column.tags.defaultColor ?? DEFAULT_MANUAL_TAG_COLOR}
                              onColorChange={(color) => handleDefaultColorChange(color)}
                              onClear={column.tags.defaultColor ? () => handleDefaultColorChange(undefined) : undefined}
                            />
                          </Stack>
                        }
                      />
                    )}
                  </>
                )}
                <FormatControls
                  value={column.format ?? DEFAULT_FORMAT}
                  onChange={(newFormat): void =>
                    onChange({
                      ...column,
                      format: newFormat,
                    })
                  }
                />
              </>
            )}
            <OptionsEditorControl
              label="Alignment"
              control={
                <AlignSelector
                  size="small"
                  value={column.align ?? 'left'}
                  onChange={(align) => onChange({ ...column, align: align })}
                />
              }
            />
            <OptionsEditorControl
              label="Custom width"
              control={
                <Switch
                  checked={column.width !== undefined && column.width !== 'auto'}
                  onChange={(e) => onChange({ ...column, width: e.target.checked ? width : 'auto' })}
                />
              }
            />
            {column.width !== undefined && column.width !== 'auto' && (
              <OptionsEditorControl
                label="Width"
                control={
                  <TextField
                    type="number"
                    value={width}
                    slotProps={{ htmlInput: { min: 1 } }}
                    onChange={(e) => {
                      setWidth(+e.target.value);
                      onChange({ ...column, width: +e.target.value });
                    }}
                  />
                }
              />
            )}
          </OptionsEditorGroup>
        </OptionsEditorColumn>
        <OptionsEditorColumn>
          <OptionsEditorGroup title="Link">
            <DataLinkEditor column={column} onChange={onChange} />
          </OptionsEditorGroup>
        </OptionsEditorColumn>
      </OptionsEditorGrid>
      {column.plugin?.kind === 'GaugeChart' && (
        <Stack sx={{ px: 8, mt: 4, width: '100%' }} spacing={2}>
          <OptionsEditorGroup title="Visualization settings">
            <EmbeddedPanelOptionsEditor
              kind="GaugeChart"
              spec={column.plugin.spec}
              onChange={(nextSpec) =>
                onChange({
                  ...column,
                  plugin: { kind: 'GaugeChart', spec: nextSpec },
                })
              }
            />
          </OptionsEditorGroup>
        </Stack>
      )}
      <Stack sx={{ px: 8, mt: column.plugin?.kind === 'GaugeChart' ? 3 : 0 }}>
        <OptionsEditorGroup title="Conditional Cell Format">
          <ConditionalPanel
            cellSettings={column.cellSettings}
            onChange={(cellSettings) => onChange({ ...column, cellSettings })}
          />
        </OptionsEditorGroup>
      </Stack>
    </Stack>
  );
}
