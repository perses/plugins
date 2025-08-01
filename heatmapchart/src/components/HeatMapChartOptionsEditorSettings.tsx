// Copyright 2025 The Perses Authors
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

import { Switch, SwitchProps } from '@mui/material';
import {
  FormatControls,
  FormatControlsProps,
  OptionsEditorColumn,
  OptionsEditorControl,
  OptionsEditorGrid,
  OptionsEditorGroup,
} from '@perses-dev/components';
import { produce } from 'immer';
import merge from 'lodash/merge';
import { ReactElement } from 'react';
import { DEFAULT_FORMAT, HeatMapChartOptions, HeatMapChartOptionsEditorProps } from '../heat-map-chart-model';

export function HeatMapChartOptionsEditorSettings(props: HeatMapChartOptionsEditorProps): ReactElement {
  const { onChange, value } = props;

  const handleYAxisFormatChange: FormatControlsProps['onChange'] = (newFormat) => {
    onChange(
      produce(value, (draft: HeatMapChartOptions) => {
        draft.yAxisFormat = newFormat;
      })
    );
  };

  const handleCountFormatChange: FormatControlsProps['onChange'] = (newFormat) => {
    onChange(
      produce(value, (draft: HeatMapChartOptions) => {
        draft.countFormat = newFormat;
      })
    );
  };

  const handleShowVisualMapChange: SwitchProps['onChange'] = (_: unknown, checked: boolean) => {
    onChange(
      produce(value, (draft: HeatMapChartOptions) => {
        draft.showVisualMap = checked;
      })
    );
  };

  // ensures decimalPlaces defaults to correct value
  const yAxisFormat = merge({}, DEFAULT_FORMAT, value.yAxisFormat);
  const countFormat = merge({}, DEFAULT_FORMAT, value.countFormat);

  return (
    <OptionsEditorGrid>
      <OptionsEditorColumn>
        <OptionsEditorGroup title="Bucket Count">
          <FormatControls value={countFormat} onChange={handleCountFormatChange} />
          <OptionsEditorControl
            label="Show Visual Map"
            control={<Switch checked={!!value.showVisualMap} onChange={handleShowVisualMapChange} />}
          />
        </OptionsEditorGroup>
      </OptionsEditorColumn>
      <OptionsEditorColumn>
        <OptionsEditorGroup title="Y Axis">
          <FormatControls value={yAxisFormat} onChange={handleYAxisFormatChange} />
        </OptionsEditorGroup>
      </OptionsEditorColumn>
    </OptionsEditorGrid>
  );
}
