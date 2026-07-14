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

import React, { ReactElement, useCallback } from 'react';
import { FormControl, FormControlLabel, InputLabel, MenuItem, Select, SelectChangeEvent, Switch } from '@mui/material';
import { CanvasSpec } from '../../model';

interface LegendSettingsProps {
  value: CanvasSpec;
  onChange: (value: CanvasSpec) => void;
}

export function LegendSettings({ value, onChange }: LegendSettingsProps): ReactElement {
  const onToggle = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      onChange({
        ...value,
        legend: event.target.checked ? { position: value.legend?.position ?? 'bottom' } : undefined,
      });
    },
    [value, onChange]
  );

  const onPositionChange = useCallback(
    (event: SelectChangeEvent<'bottom' | 'right'>): void => {
      onChange({ ...value, legend: { position: event.target.value as 'bottom' | 'right' } });
    },
    [value, onChange]
  );

  return (
    <>
      <FormControlLabel
        control={<Switch checked={value.legend !== undefined} onChange={onToggle} />}
        label="Show legend"
      />
      {value.legend !== undefined && (
        <FormControl size="small" sx={{ width: 180 }}>
          <InputLabel>Position</InputLabel>
          <Select
            label="Position"
            value={value.legend.position ?? 'bottom'}
            onChange={onPositionChange}
            MenuProps={{ PaperProps: { style: { maxHeight: 240 } } }}
          >
            <MenuItem value="bottom">Bottom</MenuItem>
            <MenuItem value="right">Right</MenuItem>
          </Select>
        </FormControl>
      )}
    </>
  );
}
