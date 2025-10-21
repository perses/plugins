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
  Divider,
  IconButton,
  MenuItem,
  Stack,
  StackProps,
  Switch,
  TextField,
  Tooltip,
  Typography,
  Grid2 as Grid,
} from '@mui/material';
import DeleteIcon from 'mdi-material-ui/DeleteOutline';
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
    <Stack {...others} spacing={2}>
      <OptionsEditorGrid>
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
        </OptionsEditorGroup>
      </OptionsEditorColumn>
      </OptionsEditorGrid>

      <Stack sx={{ px: 8 }}>
        <OptionsEditorGroup title="Conditional Format">
          <OptionsEditorControl
            label="Enable Conditional Formatting"
            control={
              <Switch
                checked={column.conditionalFormatting ?? false}
                onChange={(e) => onChange({ ...column, conditionalFormatting: e.target.checked })}
              />
            }
          />
        {column.conditionalFormatting && (
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 5 }}>
                <Typography variant="subtitle1">Condition</Typography>
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Typography variant="subtitle1">Display Text</Typography>
              </Grid>
              <Grid size={{ xs: 1 }} textAlign="center">
                <Typography variant="subtitle1">Color</Typography>
              </Grid>
              <Grid size={{ xs: 1 }} textAlign="center">
                <Typography variant="subtitle1">Background</Typography>
              </Grid>
              <Grid size={{ xs: 1 }}></Grid>
            </Grid>
            <Stack gap={1.5} divider={<Divider flexItem orientation="horizontal" />}>
              {(column.cellSettings ?? []).map((cell, i) => (
                <ConditionalFormatRule
                  key={i}
                  cell={cell}
                  onChange={(updatedCell: CellSettings) => {
                    const updatedCells = [...(column.cellSettings ?? [])];
                    updatedCells[i] = updatedCell;
                    onChange({ ...column, cellSettings: updatedCells });
                  }}
                  onDelete={() => {
                    const updatedCells = [...(column.cellSettings ?? [])];
                    updatedCells.splice(i, 1);
                    onChange({ ...column, cellSettings: updatedCells.length > 0 ? updatedCells : undefined });
                  }}
                />
              ))}
            </Stack>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              sx={{ marginTop: 1 }}
              onClick={() => {
                const updatedCells = [...(column.cellSettings ?? [])];
                updatedCells.push({ condition: { kind: 'Value', spec: { value: '' } } });
                onChange({ ...column, cellSettings: updatedCells });
              }}
            >
              Add Conditional Column Settings
            </Button>
          </Stack>
        )}
        </OptionsEditorGroup>
      </Stack>
    </Stack>
  );
}

interface ConditionalFormatRuleProps {
  cell: CellSettings;
  onChange: (cell: CellSettings) => void;
  onDelete: () => void;
}

function ConditionalFormatRule({ cell, onChange, onDelete }: ConditionalFormatRuleProps): ReactElement {
  function ConditionEditor({
    condition,
    onChange: onConditionChange,
  }: {
    condition: Condition;
    onChange: (condition: Condition) => void;
  }): ReactElement | null {
    if (condition.kind === 'Value') {
      return (
        <TextField
          label="Value"
          placeholder="Exact value"
          value={condition.spec?.value ?? ''}
          onChange={(e) => onConditionChange({ ...condition, spec: { value: e.target.value } } as Condition)}
          fullWidth
          size="small"
        />
      );
    } else if (condition.kind === 'Range') {
      return (
        <Stack gap={1} direction="row">
          <TextField
            label="From"
            placeholder="Start of range"
            value={condition.spec?.min ?? ''}
            onChange={(e) =>
              onConditionChange({ ...condition, spec: { ...condition.spec, min: +e.target.value } } as Condition)
            }
            fullWidth
            size="small"
          />
          <TextField
            label="To"
            placeholder="End of range (inclusive)"
            value={condition.spec?.max ?? ''}
            onChange={(e) =>
              onConditionChange({ ...condition, spec: { ...condition.spec, max: +e.target.value } } as Condition)
            }
            fullWidth
            size="small"
          />
        </Stack>
      );
    } else if (condition.kind === 'Regex') {
      return (
        <TextField
          label="Regular Expression"
          placeholder="JavaScript regular expression"
          value={condition.spec?.expr ?? ''}
          onChange={(e) => onConditionChange({ ...condition, spec: { expr: e.target.value } } as Condition)}
          fullWidth
          size="small"
        />
      );
    } else if (condition.kind === 'Misc') {
      return (
        <TextField
          select
          label="Value"
          value={condition.spec?.value ?? ''}
          onChange={(e) => onConditionChange({ ...condition, spec: { value: e.target.value } } as Condition)}
          fullWidth
          size="small"
        >
          <MenuItem value="empty">
            <Stack>
              <Typography>Empty</Typography>
              <Typography variant="caption">Matches empty string</Typography>
            </Stack>
          </MenuItem>
          <MenuItem value="null">
            <Stack>
              <Typography>Null</Typography>
              <Typography variant="caption">Matches null or undefined</Typography>
            </Stack>
          </MenuItem>
          <MenuItem value="NaN">
            <Stack>
              <Typography>NaN</Typography>
              <Typography variant="caption">Matches Not a Number value</Typography>
            </Stack>
          </MenuItem>
          <MenuItem value="true">
            <Stack>
              <Typography>True</Typography>
              <Typography variant="caption">Matches true boolean</Typography>
            </Stack>
          </MenuItem>
          <MenuItem value="false">
            <Stack>
              <Typography>False</Typography>
              <Typography variant="caption">Matches false boolean</Typography>
            </Stack>
          </MenuItem>
        </TextField>
      );
    }
    return null;
  }

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 5 }}>
        <Stack direction="row" gap={1} width="100%">
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
              onChange({ ...cell, condition: newCondition });
            }}
            required
            sx={{ width: '120px' }}
            size="small"
          >
            <MenuItem value="Value">
              <Stack>
                <Typography>Value</Typography>
                {cell.condition.kind !== 'Value' && (
                  <Typography variant="caption">Matches an exact text value</Typography>
                )}
              </Stack>
            </MenuItem>
            <MenuItem value="Range">
              <Stack>
                <Typography>Range</Typography>
                {cell.condition.kind !== 'Range' && (
                  <Typography variant="caption">Matches against a numerical range</Typography>
                )}
              </Stack>
            </MenuItem>
            <MenuItem value="Regex">
              <Stack>
                <Typography>Regex</Typography>
                {cell.condition.kind !== 'Regex' && (
                  <Typography variant="caption">Matches against a regular expression</Typography>
                )}
              </Stack>
            </MenuItem>
            <MenuItem value="Misc">
              <Stack>
                <Typography>Misc</Typography>
                {cell.condition.kind !== 'Misc' && (
                  <Typography variant="caption">Matches against empty, null and NaN values</Typography>
                )}
              </Stack>
            </MenuItem>
          </TextField>
          <ConditionEditor
            condition={cell.condition}
            onChange={(updatedCondition) => onChange({ ...cell, condition: updatedCondition })}
          />
        </Stack>
      </Grid>
      <Grid size={{ xs: 4 }}>
        <Stack spacing={1}>
          <TextField
            label="Display text"
            value={cell.text ?? ''}
            onChange={(e) => onChange({ ...cell, text: e.target.value })}
            fullWidth
            size="small"
          />
          <Stack direction="row" spacing={1}>
            <TextField
              label="Prefix"
              placeholder="$"
              value={cell.prefix ?? ''}
              onChange={(e) => onChange({ ...cell, prefix: e.target.value })}
              size="small"
            />
            <TextField
              label="Suffix"
              placeholder="%"
              value={cell.suffix ?? ''}
              onChange={(e) => onChange({ ...cell, suffix: e.target.value })}
              size="small"
            />
          </Stack>
        </Stack>
      </Grid>
      <Grid size={{ xs: 1 }}>
        <Stack direction="row" justifyContent="center" gap={1}>
          {cell.textColor ? (
            <OptionsColorPicker
              label="Text Color"
              color={cell.textColor ?? '#000'}
              onColorChange={(color) => onChange({ ...cell, textColor: color } as CellSettings)}
              onClear={() => onChange({ ...cell, textColor: undefined } as CellSettings)}
            />
          ) : (
            <IconButton onClick={() => onChange({ ...cell, textColor: '#000000' as `#${string}` })}>
              <AddIcon />
            </IconButton>
          )}
        </Stack>
      </Grid>
      <Grid size={{ xs: 1 }}>
        <Stack direction="row" justifyContent="center">
          {cell.backgroundColor ? (
            <OptionsColorPicker
              label="Background Color"
              color={cell.backgroundColor ?? '#fff'}
              onColorChange={(color) => onChange({ ...cell, backgroundColor: color } as CellSettings)}
              onClear={() => onChange({ ...cell, backgroundColor: undefined } as CellSettings)}
            />
          ) : (
            <IconButton onClick={() => onChange({ ...cell, backgroundColor: '#ffffff' as `#${string}` })}>
              <AddIcon />
            </IconButton>
          )}
        </Stack>
      </Grid>
      <Grid size={{ xs: 1 }} textAlign="end">
        <Tooltip title="Remove conditional format rule" placement="top">
          <IconButton size="small" sx={{ marginLeft: 'auto' }} onClick={onDelete}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </Grid>
    </Grid>
  );
}
