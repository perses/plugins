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

import { OptionsEditorProps } from '@perses-dev/plugin-system';
import { ReactElement, useCallback } from 'react';
import {
  OptionsEditorColumn,
  OptionsEditorControl,
  OptionsEditorGrid,
  OptionsEditorGroup,
} from '@perses-dev/components';
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { TraceheatmapOptions } from './traceheatmap-chart-model';
import { ExponentialBase } from './traceheatmap-duration-bucket-util';

export type TraceheatmapSettingsEditorProps = OptionsEditorProps<TraceheatmapOptions>;

export const TraceheatmapSettingsEditor = (props: TraceheatmapSettingsEditorProps): ReactElement => {
  const { onChange, value } = props;
  const bases: ExponentialBase[] = [2, 10];

  const handleChange = useCallback(
    (event: SelectChangeEvent) => {
      const base = Number(event.target.value) as ExponentialBase;
      onChange({ ...value, bucketSettings: { ...value.bucketSettings, base } });
    },
    [onChange, value]
  );

  return (
    <OptionsEditorGrid>
      <OptionsEditorColumn>
        <OptionsEditorGroup title="Buckets">
          <OptionsEditorControl
            label="Exponential Base"
            control={
              <FormControl>
                <InputLabel>Base</InputLabel>
                <Select value={`${value.bucketSettings.base}`} label="Base" onChange={handleChange}>
                  {bases.map((b) => (
                    <MenuItem key={b} value={b}>
                      {b}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            }
          />
        </OptionsEditorGroup>
      </OptionsEditorColumn>
    </OptionsEditorGrid>
  );
};
