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

import merge from 'lodash/merge';
import {
  CalculationSelector,
  CalculationSelectorProps,
  LegendOptionsEditor,
  LegendOptionsEditorProps,
} from '@perses-dev/plugin-system';
import { produce } from 'immer';
import {
  FormatControls,
  FormatControlsProps,
  OptionsColorPicker,
  OptionsEditorGroup,
  OptionsEditorGrid,
  OptionsEditorColumn,
  SortSelector,
  SortSelectorProps,
  ModeSelector,
  ModeSelectorProps,
  ModeOption,
  SortOption,
  OptionsEditorControl,
} from '@perses-dev/components';
import { CalculationType, isPercentUnit, FormatOptions } from '@perses-dev/core';
import { Button, FormControl, InputLabel, MenuItem, Select, Stack, Switch, SwitchProps, Typography, useTheme } from '@mui/material';
import { ReactElement, useMemo } from 'react';
import { PieChartOptions, PieChartOptionsEditorProps, DEFAULT_FORMAT } from './pie-chart-model';

export function PieChartOptionsEditorSettings(props: PieChartOptionsEditorProps): ReactElement {
  const { onChange, value } = props;
  const muiTheme = useTheme();

  const handleCalculationChange: CalculationSelectorProps['onChange'] = (newCalculation: CalculationType) => {
    onChange(
      produce(value, (draft: PieChartOptions) => {
        draft.calculation = newCalculation;
      })
    );
  };

  const handleLegendChange: LegendOptionsEditorProps['onChange'] = (newLegend) => {
    onChange(
      produce(value, (draft: PieChartOptions) => {
        draft.legend = newLegend;
      })
    );
  };

  const handleUnitChange: FormatControlsProps['onChange'] = (newFormat: FormatOptions) => {
    onChange(
      produce(value, (draft: PieChartOptions) => {
        draft.format = newFormat;
      })
    );
  };

  const handleSortChange: SortSelectorProps['onChange'] = (newSort: SortOption) => {
    onChange(
      produce(value, (draft: PieChartOptions) => {
        draft.sort = newSort;
      })
    );
  };

  const handleModeChange: ModeSelectorProps['onChange'] = (newMode: ModeOption) => {
    onChange(
      produce(value, (draft: PieChartOptions) => {
        draft.mode = newMode;
      })
    );
  };

  const handleShowLabelsChange: SwitchProps['onChange'] = (_: unknown, checked: boolean) => {
    onChange(
      produce(value, (draft: PieChartOptions) => {
        draft.showLabels = checked;
      })
    );
  };

  const color: string = useMemo(() => {
    return value.color || '';
  }, [value.color]);

  const handleColorChange = (color: string) => {
    onChange(
      produce(value, (draft: PieChartOptions) => {
        draft.color = color;
      })
    );
  };

  // ensures decimalPlaces defaults to correct value
  const format = merge({}, DEFAULT_FORMAT, value.format);

  return (
    <OptionsEditorGrid>
      <OptionsEditorColumn>
        <LegendOptionsEditor calculation="comparison" value={value.legend} onChange={handleLegendChange} />
        <OptionsEditorGroup title="Misc">
          <OptionsEditorControl
            label="Show Labels"
            control={
              <Switch
                checked={Boolean(value.showLabels)}
                onChange={handleShowLabelsChange}
              />
            }
          />
          <FormatControls value={format} onChange={handleUnitChange} disabled={value.mode === 'percentage'} />
          <CalculationSelector value={value.calculation} onChange={handleCalculationChange} />
          <SortSelector value={value.sort} onChange={handleSortChange} />
          <ModeSelector value={value.mode} onChange={handleModeChange} disablePercentageMode={isPercentUnit(format)} />
        </OptionsEditorGroup>
      </OptionsEditorColumn>
      <OptionsEditorColumn>
        <OptionsEditorGroup title="Colors">
          <Stack spacing={2}>            
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Color Scheme</InputLabel>
                <Select
                  value={color === '' ? 'theme' : 'custom'}
                  label="Color Scheme"
                  onChange={(e) => {
                    if (e.target.value === 'theme') {
                      handleColorChange('');
                    } else {
                      handleColorChange(color || muiTheme.palette.primary.main);
                    }
                  }}
                >
                  <MenuItem value="theme">Theme Default</MenuItem>
                  <MenuItem value="custom">Custom Color</MenuItem>
                </Select>
              </FormControl>
              
              {color !== '' && (
                <OptionsColorPicker
                  label="Color"
                  color={color}
                  onColorChange={handleColorChange}
                />
              )}
            </Stack>

            {color === '' && (
              <Typography variant="body2" color="text.secondary">
                Colors will be automatically assigned using the current theme's color palette.
              </Typography>
            )}

            {color !== '' && (
              <Typography variant="body2" color="text.secondary">
                All series will use a gradient based on the selected color.
              </Typography>
            )}
          </Stack>
        </OptionsEditorGroup>
        <OptionsEditorGroup title="Reset Settings">
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => {
              onChange(
                produce(value, (draft: PieChartOptions) => {
                  // reset button removes all optional panel options
                  draft.legend = undefined;
                  draft.color = '';
                })
              );
            }}
          >
            Reset To Defaults
          </Button>
        </OptionsEditorGroup>
      </OptionsEditorColumn>
    </OptionsEditorGrid>
  );
}
