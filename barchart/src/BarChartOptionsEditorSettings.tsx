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

import {
  Autocomplete,
  Button,
  Chip,
  FormControlLabel,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  FormatControls,
  FormatControlsProps,
  ModeOption,
  ModeSelector,
  ModeSelectorProps,
  OptionsEditorColumn,
  OptionsEditorGrid,
  OptionsEditorGroup,
  SortOption,
  SortSelector,
  SortSelectorProps,
} from '@perses-dev/components';
import { CalculationType, DEFAULT_CALCULATION, FormatOptions, isPercentUnit } from '@perses-dev/core';
import { CalculationSelector, CalculationSelectorProps } from '@perses-dev/plugin-system';
import { produce } from 'immer';
import merge from 'lodash/merge';
import { MouseEventHandler, ReactElement } from 'react';
import {
  BarChartOptions,
  BarChartOptionsEditorProps,
  DEFAULT_FORMAT,
  DEFAULT_MODE,
  DEFAULT_ORIENTATION,
  DEFAULT_SORT,
  DEFAULT_IS_STACKED,
  DEFAULT_GROUP_BY,
} from './bar-chart-model';

export function BarChartOptionsEditorSettings(props: BarChartOptionsEditorProps): ReactElement {
  const { onChange, value } = props;

  const handleCalculationChange: CalculationSelectorProps['onChange'] = (newCalculation: CalculationType) => {
    onChange(
      produce(value, (draft: BarChartOptions) => {
        draft.calculation = newCalculation;
      })
    );
  };

  const handleUnitChange: FormatControlsProps['onChange'] = (newFormat: FormatOptions) => {
    onChange(
      produce(value, (draft: BarChartOptions) => {
        draft.format = newFormat;
      })
    );
  };

  const handleSortChange: SortSelectorProps['onChange'] = (newSort: SortOption) => {
    onChange(
      produce(value, (draft: BarChartOptions) => {
        draft.sort = newSort;
      })
    );
  };

  const handleModeChange: ModeSelectorProps['onChange'] = (newMode: ModeOption) => {
    onChange(
      produce(value, (draft: BarChartOptions) => {
        draft.mode = newMode;
      })
    );
  };

  const handleResetSettings: MouseEventHandler<HTMLButtonElement> = () => {
    onChange(
      produce(value, (draft: BarChartOptions) => {
        draft.calculation = DEFAULT_CALCULATION;
        draft.format = DEFAULT_FORMAT;
        draft.sort = DEFAULT_SORT;
        draft.mode = DEFAULT_MODE;
        draft.groupBy = DEFAULT_GROUP_BY;
        draft.isStacked = DEFAULT_IS_STACKED;
        draft.orientation = DEFAULT_ORIENTATION;
      })
    );
  };

  // ensures decimalPlaces defaults to correct value
  const format = merge({}, DEFAULT_FORMAT, value.format);
  const groupBy = value.groupBy ?? DEFAULT_GROUP_BY;
  const isStacked = value.isStacked ?? DEFAULT_IS_STACKED;

  return (
    <OptionsEditorGrid>
      <OptionsEditorColumn>
        <OptionsEditorGroup title="Misc">
          <FormatControls value={format} onChange={handleUnitChange} disabled={value.mode === 'percentage'} />
          <CalculationSelector value={value.calculation} onChange={handleCalculationChange} />
          <SortSelector value={value.sort} onChange={handleSortChange} />
          <ModeSelector value={value.mode} onChange={handleModeChange} disablePercentageMode={isPercentUnit(format)} />
          <ToggleButtonGroup
            exclusive
            size="small"
            value={value.orientation ?? 'horizontal'}
            onChange={(_, v) =>
              v &&
              onChange(
                produce(value, (draft: BarChartOptions) => {
                  draft.orientation = v;
                })
              )
            }
          >
            <ToggleButton value="horizontal">Horizontal</ToggleButton>
            <ToggleButton value="vertical">Vertical</ToggleButton>
          </ToggleButtonGroup>
        </OptionsEditorGroup>
        <OptionsEditorGroup title="Stacking">
          <Autocomplete
            multiple
            freeSolo
            value={groupBy}
            onChange={(_, newValue) =>
              onChange(
                produce(value, (draft: BarChartOptions) => {
                  draft.groupBy = newValue as string[];
                  if ((newValue as string[]).length === 0) draft.isStacked = false;
                })
              )
            }
            options={[]}
            renderTags={(tagValues, getTagProps) =>
              tagValues.map((option, index) => (
                <Chip size="small" variant="outlined" label={option} {...getTagProps({ index })} key={option} />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} size="small" label="Group By Labels" placeholder="Type label name + Enter" />
            )}
          />
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={isStacked}
                disabled={groupBy.length === 0}
                onChange={(e) =>
                  onChange(
                    produce(value, (draft: BarChartOptions) => {
                      draft.isStacked = e.target.checked;
                    })
                  )
                }
              />
            }
            label="Stack bars"
          />
        </OptionsEditorGroup>
      </OptionsEditorColumn>
      <OptionsEditorColumn>
        <OptionsEditorGroup title="Reset Settings">
          <Button variant="outlined" color="secondary" onClick={handleResetSettings}>
            Reset To Defaults
          </Button>
        </OptionsEditorGroup>
      </OptionsEditorColumn>
    </OptionsEditorGrid>
  );
}
