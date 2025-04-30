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

import { TextField } from '@mui/material';
import {
  FormatControls,
  FormatControlsProps,
  OptionsEditorColumn,
  OptionsEditorControl,
  OptionsEditorGrid,
  OptionsEditorGroup,
  ThresholdsEditor,
  ThresholdsEditorProps,
} from '@perses-dev/components';
import { produce } from 'immer';
import merge from 'lodash/merge';
import { ReactElement } from 'react';
import {
  DEFAULT_FORMAT,
  DEFAULT_MAX_PERCENT,
  DEFAULT_MAX_PERCENT_DECIMAL,
  DEFAULT_MIN_PERCENT,
  DEFAULT_MIN_PERCENT_DECIMAL,
  DEFAULT_THRESHOLDS,
  HistogramChartOptions,
  HistogramChartOptionsEditorProps,
} from '../histogram-chart-model';

export function HistogramChartOptionsEditorSettings(props: HistogramChartOptionsEditorProps): ReactElement {
  const { onChange, value } = props;

  const handleUnitChange: FormatControlsProps['onChange'] = (newFormat) => {
    onChange(
      produce(value, (draft: HistogramChartOptions) => {
        draft.format = newFormat;
      })
    );
  };

  const handleThresholdsChange: ThresholdsEditorProps['onChange'] = (thresholds) => {
    onChange(
      produce(value, (draft: HistogramChartOptions) => {
        draft.thresholds = thresholds;
      })
    );
  };

  // ensures decimalPlaces defaults to correct value
  const format = merge({}, DEFAULT_FORMAT, value.format);
  const thresholds = merge({}, DEFAULT_THRESHOLDS, value.thresholds);

  // max only needs to be set explicitly for units other than percent and percent-decimal
  let minPlaceholder = 'Enter value';
  if (format.unit === 'percent') {
    minPlaceholder = DEFAULT_MIN_PERCENT.toString();
  } else if (format.unit === 'percent-decimal') {
    minPlaceholder = DEFAULT_MIN_PERCENT_DECIMAL.toString();
  }

  // max only needs to be set explicitly for units other than percent and percent-decimal
  let maxPlaceholder = 'Enter value';
  if (format.unit === 'percent') {
    maxPlaceholder = DEFAULT_MAX_PERCENT.toString();
  } else if (format.unit === 'percent-decimal') {
    maxPlaceholder = DEFAULT_MAX_PERCENT_DECIMAL.toString();
  }

  return (
    <OptionsEditorGrid>
      <OptionsEditorColumn>
        <OptionsEditorGroup title="Misc">
          <FormatControls value={format} onChange={handleUnitChange} />
          <OptionsEditorControl
            label="Min"
            control={
              <TextField
                type="number"
                value={value.min ?? ''}
                onChange={(e) => {
                  // ensure empty value resets to undef to allow chart to calculate max
                  const newValue = e.target.value ? Number(e.target.value) : undefined;
                  onChange(
                    produce(value, (draft: HistogramChartOptions) => {
                      draft.min = newValue;
                    })
                  );
                }}
                placeholder={minPlaceholder}
                sx={{ width: '100%' }}
              />
            }
          />
          <OptionsEditorControl
            label="Max"
            control={
              <TextField
                type="number"
                value={value.max ?? ''}
                onChange={(e) => {
                  // ensure empty value resets to undef to allow chart to calculate max
                  const newValue = e.target.value ? Number(e.target.value) : undefined;
                  onChange(
                    produce(value, (draft: HistogramChartOptions) => {
                      draft.max = newValue;
                    })
                  );
                }}
                placeholder={maxPlaceholder}
                sx={{ width: '100%' }}
              />
            }
          />
        </OptionsEditorGroup>
      </OptionsEditorColumn>
      <OptionsEditorColumn>
        <ThresholdsEditor thresholds={thresholds} onChange={handleThresholdsChange} />
      </OptionsEditorColumn>
    </OptionsEditorGrid>
  );
}
