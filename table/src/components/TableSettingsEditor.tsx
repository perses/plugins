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

import { Switch, TextField } from '@mui/material';
import {
  DEFAULT_COLUMN_HEIGHT,
  DEFAULT_COLUMN_WIDTH,
  DensitySelector,
  OptionsEditorColumn,
  OptionsEditorControl,
  OptionsEditorGrid,
  OptionsEditorGroup,
  TableDensity,
} from '@perses-dev/components';
import { ChangeEvent, ReactElement } from 'react';
import { TableSettingsEditorProps } from '../models';

interface DefaultColumnsDimensionsControlProps {
  label: string;
  defaultValue: number;
  value?: 'auto' | number;
  onChange: (value: 'auto' | number) => void;
}

function DefaultColumnsDimensionsControl({
  label,
  defaultValue,
  value,
  onChange,
}: DefaultColumnsDimensionsControlProps): ReactElement {
  function handleAutoSwitchChange(_: ChangeEvent, checked: boolean): void {
    if (checked) {
      return onChange('auto');
    }
    onChange(defaultValue);
  }

  return (
    <>
      <OptionsEditorControl
        label={`Auto Columns ${label}`}
        control={<Switch checked={value === undefined || value === 'auto'} onChange={handleAutoSwitchChange} />}
      />
      {value !== undefined && value !== 'auto' && (
        <OptionsEditorControl
          label={`Default Columns ${label}`}
          control={
            <TextField
              type="number"
              value={value ?? defaultValue}
              slotProps={{ input: { inputProps: { min: 1, step: 1 } } }}
              onChange={(e) => onChange(parseInt(e.target.value))}
            />
          }
        />
      )}
    </>
  );
}

export function TableSettingsEditor({ onChange, value }: TableSettingsEditorProps): ReactElement {
  function handleDensityChange(density: TableDensity): void {
    onChange({ ...value, density: density });
  }

  function handlePaginationChange(_event: ChangeEvent, newValue: boolean): void {
    onChange({ ...value, pagination: newValue });
  }

  function handleDefaultColumnHiddenChange(_event: ChangeEvent, newValue: boolean): void {
    onChange({ ...value, defaultColumnHidden: newValue });
  }

  function handleAutoWidthChange(newValue: 'auto' | number): void {
    onChange({ ...value, defaultColumnWidth: newValue });
  }

  function handleAutoHeightChange(newValue: 'auto' | number): void {
    onChange({ ...value, defaultColumnHeight: newValue });
  }

  function handleEnableFilteringChange(_event: ChangeEvent, checked: boolean): void {
    onChange({ ...value, enableFiltering: checked });
  }

  return (
    <OptionsEditorGrid>
      <OptionsEditorColumn>
        <OptionsEditorGroup title="Display">
          <DensitySelector value={value.density} onChange={handleDensityChange} />
          <OptionsEditorControl
            label="Pagination"
            control={<Switch checked={!!value.pagination} onChange={handlePaginationChange} />}
          />
          <OptionsEditorControl
            label="Columns Hidden by Default"
            control={<Switch checked={!!value.defaultColumnHidden} onChange={handleDefaultColumnHiddenChange} />}
          />
          <OptionsEditorControl
            label="Enable Column Filtering"
            control={<Switch checked={!!value.enableFiltering} onChange={handleEnableFilteringChange} />}
          />

          <DefaultColumnsDimensionsControl
            label="Width"
            defaultValue={DEFAULT_COLUMN_WIDTH}
            value={value.defaultColumnWidth}
            onChange={handleAutoWidthChange}
          />
          <DefaultColumnsDimensionsControl
            label="Height"
            defaultValue={DEFAULT_COLUMN_HEIGHT}
            value={value.defaultColumnHeight}
            onChange={handleAutoHeightChange}
          />
        </OptionsEditorGroup>
      </OptionsEditorColumn>
    </OptionsEditorGrid>
  );
}
