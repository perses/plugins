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
  IconButton,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import type {
  FormatControlsProps,
  FormatOptions,
  ModeOption,
  ModeSelectorProps,
  SortOption,
  SortSelectorProps,
} from '@perses-dev/components';
import {
  FormatControls,
  isPercentUnit,
  isUnitWithShortValues,
  ModeSelector,
  OptionsColorPicker,
  OptionsEditorColumn,
  OptionsEditorGrid,
  OptionsEditorGroup,
  SortSelector,
} from '@perses-dev/components';
import type { CalculationSelectorProps, CalculationType } from '@perses-dev/plugin-system';
import { CalculationSelector, DEFAULT_CALCULATION } from '@perses-dev/plugin-system';
import { produce } from 'immer';
import merge from 'lodash/merge';
import omit from 'lodash/omit';
import DeleteIcon from 'mdi-material-ui/DeleteOutline';
import AddIcon from 'mdi-material-ui/Plus';
import type { MouseEventHandler, ReactElement } from 'react';

import type { BarChartOptions, BarChartOptionsEditorProps } from './bar-chart-model';
import {
  DEFAULT_FORMAT,
  DEFAULT_MODE,
  DEFAULT_ORIENTATION,
  DEFAULT_SORT,
  DEFAULT_IS_STACKED,
  DEFAULT_GROUP_BY,
  DEFAULT_VISUAL,
} from './bar-chart-model';

const DEFAULT_COLOR_VALUE = '#555';

export function BarChartOptionsEditorSettings(props: BarChartOptionsEditorProps): ReactElement {
  const { onChange, value } = props;

  const handleCalculationChange: CalculationSelectorProps['onChange'] = (newCalculation: CalculationType) => {
    onChange(
      produce(value, (draft: BarChartOptions) => {
        draft.calculation = newCalculation;
      }),
    );
  };

  const handleUnitChange: FormatControlsProps['onChange'] = (newFormat: FormatOptions) => {
    onChange(
      produce(value, (draft: BarChartOptions) => {
        draft.format = newFormat;
      }),
    );
  };

  const handleSortChange: SortSelectorProps['onChange'] = (newSort: SortOption) => {
    onChange(
      produce(value, (draft: BarChartOptions) => {
        draft.sort = newSort;
      }),
    );
  };

  const handleModeChange: ModeSelectorProps['onChange'] = (newMode: ModeOption) => {
    onChange(
      produce(value, (draft: BarChartOptions) => {
        draft.mode = newMode;
      }),
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
        draft.visual = DEFAULT_VISUAL;
      }),
    );
  };

  const handleAddColorOverride = (): void => {
    onChange(
      produce(value, (draft: BarChartOptions) => {
        if (!draft.visual) draft.visual = {};
        if (!draft.visual.colorOverrides) draft.visual.colorOverrides = [];
        draft.visual.colorOverrides.push({ regex: '', color: DEFAULT_COLOR_VALUE });
      }),
    );
  };

  const handleRemoveColorOverride = (index: number): void => {
    onChange(
      produce(value, (draft: BarChartOptions) => {
        draft.visual?.colorOverrides?.splice(index, 1);
      }),
    );
  };

  const handleColorOverrideRegexChange = (index: number, regex: string): void => {
    onChange(
      produce(value, (draft: BarChartOptions) => {
        const override = draft.visual?.colorOverrides?.[index];
        if (override) override.regex = regex;
      }),
    );
  };

  const handleColorOverrideColorChange = (index: number, color: string): void => {
    onChange(
      produce(value, (draft: BarChartOptions) => {
        const override = draft.visual?.colorOverrides?.[index];
        if (override) override.color = color;
      }),
    );
  };

  // ensures decimalPlaces defaults to correct value
  const format = merge(
    {},
    !value.format || isUnitWithShortValues(value.format) ? DEFAULT_FORMAT : omit(DEFAULT_FORMAT, ['shortValues']),
    value.format,
  );
  const groupBy = value.groupBy ?? DEFAULT_GROUP_BY;
  const isStacked = value.isStacked ?? DEFAULT_IS_STACKED;
  const colorOverrides = value.visual?.colorOverrides ?? [];

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
                }),
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
            onChange={(_, newValue) => {
              const filtered = (newValue as string[]).filter((v) => v.trim() !== '');
              onChange(
                produce(value, (draft: BarChartOptions) => {
                  draft.groupBy = filtered;
                  if (filtered.length === 0) draft.isStacked = false;
                }),
              );
            }}
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
                    }),
                  )
                }
              />
            }
            label="Stack bars"
          />
        </OptionsEditorGroup>
      </OptionsEditorColumn>
      <OptionsEditorColumn>
        <OptionsEditorGroup title="Color Overrides">
          {colorOverrides.map((override, i) => (
            <Stack key={i} direction="row" alignItems="center" spacing={1}>
              <TextField
                size="small"
                label="Regex"
                value={override.regex}
                onChange={(e) => handleColorOverrideRegexChange(i, e.target.value)}
                sx={{ flexGrow: 1 }}
              />
              <OptionsColorPicker
                label={override.regex || `Color override n°${i + 1}`}
                color={override.color || DEFAULT_COLOR_VALUE}
                onColorChange={(color) => handleColorOverrideColorChange(i, color)}
              />
              <IconButton aria-label={`delete color override n°${i + 1}`} onClick={() => handleRemoveColorOverride(i)}>
                <DeleteIcon />
              </IconButton>
            </Stack>
          ))}
          <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddColorOverride}>
            Add Color Override
          </Button>
        </OptionsEditorGroup>
        <OptionsEditorGroup title="Reset Settings">
          <Button variant="outlined" color="secondary" onClick={handleResetSettings}>
            Reset To Defaults
          </Button>
        </OptionsEditorGroup>
      </OptionsEditorColumn>
    </OptionsEditorGrid>
  );
}
