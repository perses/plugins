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

import {
  Button,
  ButtonGroup,
  IconButton,
  MenuItem,
  Stack,
  StackProps,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { ReactElement, useState } from 'react';
import AddIcon from 'mdi-material-ui/Plus';
import {
  AlignSelector,
  FormatControls,
  OptionsColorPicker,
  OptionsEditorColumn,
  OptionsEditorControl,
  OptionsEditorGrid,
  OptionsEditorGroup,
  SortSelectorButtons,
} from '@perses-dev/components';
import { FormatOptions } from '@perses-dev/core';
import { PluginKindSelect } from '@perses-dev/plugin-system';
import {
  ColumnSettings,
  CellSettings,
  Condition,
  ValueCondition,
  RangeCondition,
  RegexCondition,
  MiscCondition,
} from '../../models';

const DEFAULT_FORMAT: FormatOptions = {
  unit: 'decimal',
  shortValues: true,
};

type OmittedMuiProps = 'children' | 'value' | 'onChange';

export interface ColumnEditorProps extends Omit<StackProps, OmittedMuiProps> {
  column: ColumnSettings;
  onChange: (column: ColumnSettings) => void;
}

export function ColumnEditor({ column, onChange, ...others }: ColumnEditorProps): ReactElement {
  const [width, setWidth] = useState<number>(
    column.width === undefined || column.width === 'auto' ? 100 : column.width
  );

  return (
    <OptionsEditorGrid {...others}>
      <OptionsEditorColumn>
        <OptionsEditorGroup title="Column">
          <OptionsEditorControl
            label="Name*"
            control={
              <TextField value={column.name} onChange={(e) => onChange({ ...column, name: e.target.value })} required />
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
                onChange={(e) => onChange({ ...column, cellDescription: e.target.value ? e.target.value : undefined })}
              />
            }
          />
          <OptionsEditorControl
            label="Enable sorting"
            control={
              <Switch
                checked={column.enableSorting ?? false}
                onChange={(e) => onChange({ ...column, enableSorting: e.target.checked })}
              />
            }
          />
          {column.enableSorting && (
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
            label="Display"
            control={
              <ButtonGroup aria-label="Display" size="small">
                <Button
                  variant={!column.plugin ? 'contained' : 'outlined'}
                  onClick={() => onChange({ ...column, plugin: undefined })}
                >
                  Text
                </Button>
                <Button
                  variant={column.plugin ? 'contained' : 'outlined'}
                  onClick={() => onChange({ ...column, plugin: { kind: 'StatChart', spec: {} } })}
                >
                  Embedded Panel
                </Button>
              </ButtonGroup>
            }
          />
          {column.plugin ? (
            <OptionsEditorControl
              label="Panel Type"
              control={
                <PluginKindSelect
                  pluginTypes={['Panel']}
                  value={{ type: 'Panel', kind: column.plugin.kind }}
                  onChange={(event) => onChange({ ...column, plugin: { kind: event.kind, spec: {} } })}
                />
              }
            />
          ) : (
            <FormatControls
              value={column.format ?? DEFAULT_FORMAT}
              onChange={(newFormat): void =>
                onChange({
                  ...column,
                  format: newFormat,
                })
              }
            />
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
          <OptionsEditorControl
            label="Conditional Format"
            control={
              <Switch
                checked={column.conditionalFormatting ?? false}
                onChange={(e) => onChange({ ...column, conditionalFormatting: e.target.checked })}
              />
            }
          />
          {column.conditionalFormatting && (
            <Stack spacing={2}>
              <Stack spacing={2}>
                {(column.cellSettings ?? [{ condition: { kind: 'Value', spec: { value: '' } } }]).map((cell, i) => (
                  <Stack
                    key={i}
                    spacing={1}
                    sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        Rule {i + 1}
                      </Typography>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => {
                          const updatedCells = [...(column.cellSettings ?? [])];
                          updatedCells.splice(i, 1);
                          onChange({ ...column, cellSettings: updatedCells.length > 0 ? updatedCells : undefined });
                        }}
                      >
                        Remove
                      </Button>
                    </Stack>

                    {/* Vertical layout for narrow column */}
                    <Stack spacing={2}>
                      {/* Condition Section */}
                      <Stack spacing={1}>
                        <Typography variant="body2" fontWeight="medium">
                          Condition
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <TextField
                            select
                            label="Type"
                            value={cell.condition.kind}
                            onChange={(e) => {
                              const kind = e.target.value as 'Value' | 'Range' | 'Regex' | 'Misc';
                              let newCondition: Condition;
                              switch (kind) {
                                case 'Value':
                                  newCondition = { kind: 'Value', spec: { value: '' } } as ValueCondition;
                                  break;
                                case 'Range':
                                  newCondition = { kind: 'Range', spec: { min: 0, max: 100 } } as RangeCondition;
                                  break;
                                case 'Regex':
                                  newCondition = { kind: 'Regex', spec: { expr: '' } } as RegexCondition;
                                  break;
                                case 'Misc':
                                  newCondition = { kind: 'Misc', spec: { value: 'empty' } } as MiscCondition;
                                  break;
                                default:
                                  newCondition = { kind: 'Value', spec: { value: '' } } as ValueCondition;
                              }
                              const updatedCell: CellSettings = { ...cell, condition: newCondition };
                              const updatedCells = [...(column.cellSettings ?? [])];
                              updatedCells[i] = updatedCell;
                              onChange({ ...column, cellSettings: updatedCells });
                            }}
                            size="small"
                            sx={{ minWidth: 120 }}
                          >
                            <MenuItem value="Value">Value</MenuItem>
                            <MenuItem value="Range">Range</MenuItem>
                            <MenuItem value="Regex">Regex</MenuItem>
                            <MenuItem value="Misc">Misc</MenuItem>
                          </TextField>
                          {/* Add condition-specific input based on type */}
                          {cell.condition.kind === 'Value' && (
                            <TextField
                              label="Value"
                              value={cell.condition.spec?.value ?? ''}
                              onChange={(e) => {
                                const updatedCell: CellSettings = {
                                  ...cell,
                                  condition: { kind: 'Value', spec: { value: e.target.value } } as ValueCondition,
                                };
                                const updatedCells = [...(column.cellSettings ?? [])];
                                updatedCells[i] = updatedCell;
                                onChange({ ...column, cellSettings: updatedCells });
                              }}
                              size="small"
                              fullWidth
                            />
                          )}
                        </Stack>
                      </Stack>

                      {/* Display Text Section */}
                      <Stack spacing={1}>
                        <Typography variant="body2" fontWeight="medium">
                          Display Text
                        </Typography>
                        <TextField
                          label="Text to display"
                          value={cell.text ?? ''}
                          onChange={(e) => {
                            const updatedCell = { ...cell, text: e.target.value };
                            const updatedCells = [...(column.cellSettings ?? [])];
                            updatedCells[i] = updatedCell;
                            onChange({ ...column, cellSettings: updatedCells });
                          }}
                          size="small"
                          fullWidth
                        />
                        <Stack direction="row" spacing={1}>
                          <TextField
                            label="Prefix"
                            placeholder="$"
                            value={cell.prefix ?? ''}
                            onChange={(e) => {
                              const updatedCell = { ...cell, prefix: e.target.value };
                              const updatedCells = [...(column.cellSettings ?? [])];
                              updatedCells[i] = updatedCell;
                              onChange({ ...column, cellSettings: updatedCells });
                            }}
                            size="small"
                            helperText="Text shown before the value"
                          />
                          <TextField
                            label="Suffix"
                            placeholder="%"
                            value={cell.suffix ?? ''}
                            onChange={(e) => {
                              const updatedCell = { ...cell, suffix: e.target.value };
                              const updatedCells = [...(column.cellSettings ?? [])];
                              updatedCells[i] = updatedCell;
                              onChange({ ...column, cellSettings: updatedCells });
                            }}
                            size="small"
                            helperText="Text shown after the value"
                          />
                        </Stack>
                      </Stack>

                      {/* Colors Section */}
                      <Stack spacing={1}>
                        <Typography variant="body2" fontWeight="medium">
                          Colors
                        </Typography>
                        <Stack direction="row" spacing={1} justifyContent="center">
                          {cell.textColor ? (
                            <OptionsColorPicker
                              label="Text Color"
                              color={cell.textColor ?? '#000'}
                              onColorChange={(color) => {
                                const updatedCell = { ...cell, textColor: color as `#${string}` };
                                const updatedCells = [...(column.cellSettings ?? [])];
                                updatedCells[i] = updatedCell;
                                onChange({ ...column, cellSettings: updatedCells });
                              }}
                              onClear={() => {
                                const updatedCell = { ...cell, textColor: undefined };
                                const updatedCells = [...(column.cellSettings ?? [])];
                                updatedCells[i] = updatedCell;
                                onChange({ ...column, cellSettings: updatedCells });
                              }}
                            />
                          ) : (
                            <IconButton
                              size="small"
                              onClick={() => {
                                const updatedCell = { ...cell, textColor: '#000000' as `#${string}` };
                                const updatedCells = [...(column.cellSettings ?? [])];
                                updatedCells[i] = updatedCell;
                                onChange({ ...column, cellSettings: updatedCells });
                              }}
                              title="Add text color"
                            >
                              <AddIcon />
                            </IconButton>
                          )}
                          {cell.backgroundColor ? (
                            <OptionsColorPicker
                              label="Background Color"
                              color={cell.backgroundColor ?? '#fff'}
                              onColorChange={(color) => {
                                const updatedCell = { ...cell, backgroundColor: color as `#${string}` };
                                const updatedCells = [...(column.cellSettings ?? [])];
                                updatedCells[i] = updatedCell;
                                onChange({ ...column, cellSettings: updatedCells });
                              }}
                              onClear={() => {
                                const updatedCell = { ...cell, backgroundColor: undefined };
                                const updatedCells = [...(column.cellSettings ?? [])];
                                updatedCells[i] = updatedCell;
                                onChange({ ...column, cellSettings: updatedCells });
                              }}
                            />
                          ) : (
                            <IconButton
                              size="small"
                              onClick={() => {
                                const updatedCell = { ...cell, backgroundColor: '#ffffff' as `#${string}` };
                                const updatedCells = [...(column.cellSettings ?? [])];
                                updatedCells[i] = updatedCell;
                                onChange({ ...column, cellSettings: updatedCells });
                              }}
                              title="Add background color"
                            >
                              <AddIcon />
                            </IconButton>
                          )}
                        </Stack>
                      </Stack>
                    </Stack>
                  </Stack>
                ))}
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  size="small"
                  onClick={() => {
                    const updatedCells = [...(column.cellSettings ?? [])];
                    updatedCells.push({ condition: { kind: 'Value', spec: { value: '' } } });
                    onChange({ ...column, cellSettings: updatedCells });
                  }}
                >
                  Add Rule
                </Button>
              </Stack>
            </Stack>
          )}
        </OptionsEditorGroup>
      </OptionsEditorColumn>
    </OptionsEditorGrid>
  );
}
