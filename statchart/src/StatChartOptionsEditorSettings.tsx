// Copyright 2023 The Perses Authors
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

import { Switch, SwitchProps, useTheme } from '@mui/material';
import {
  FontSizeOption,
  FontSizeSelector,
  FontSizeSelectorProps,
  FormatControls,
  FormatControlsProps,
  OptionsColorPicker,
  OptionsEditorColumn,
  OptionsEditorControl,
  OptionsEditorGrid,
  OptionsEditorGroup,
  ThresholdsEditor,
  ThresholdsEditorProps,
  OptionsColorPickerProps,
} from '@perses-dev/components';
import { FormatOptions } from '@perses-dev/core';
import {
  CalculationSelector,
  CalculationSelectorProps,
  MetricLabelInput,
  MetricLabelInputProps,
} from '@perses-dev/plugin-system';
import { produce } from 'immer';
import merge from 'lodash/merge';
import { ReactElement, useMemo } from 'react';
import { StatChartOptions, StatChartOptionsEditorProps } from './stat-chart-model';

const DEFAULT_FORMAT: FormatOptions = { unit: 'percent-decimal' };
const DEMONSTRATION_WHITE_BACKGROUND = '#F5F5F5';

export function StatChartOptionsEditorSettings(props: StatChartOptionsEditorProps): ReactElement {
  const { onChange, value } = props;
  const theme = useTheme();

  // ensures decimalPlaces defaults to correct value
  const format = merge({}, DEFAULT_FORMAT, value.format);

  const handleCalculationChange: CalculationSelectorProps['onChange'] = (metricLabel) => {
    onChange(
      produce(value, (draft: StatChartOptions) => {
        draft.calculation = metricLabel;
      })
    );
  };

  const handleMetricLabelChange: MetricLabelInputProps['onChange'] = (newCalculation) => {
    onChange(
      produce(value, (draft: StatChartOptions) => {
        draft.metricLabel = newCalculation;
      })
    );
  };

  const handleUnitChange: FormatControlsProps['onChange'] = (newFormat) => {
    onChange(
      produce(value, (draft: StatChartOptions) => {
        draft.format = newFormat;
      })
    );
  };

  const handleSparklineChange: SwitchProps['onChange'] = (_: unknown, checked: boolean) => {
    onChange(
      produce(value, (draft: StatChartOptions) => {
        // For now, setting to an empty object when checked, so the stat chart
        // uses the default chart color and line styles. In the future, this
        // will likely be configurable in the UI.
        draft.sparkline = checked ? {} : undefined;
      })
    );
  };

  const handleThresholdsChange: ThresholdsEditorProps['onChange'] = (thresholds) => {
    onChange(
      produce(value, (draft: StatChartOptions) => {
        draft.thresholds = thresholds;
      })
    );
  };

  const handleFontSizeChange: FontSizeSelectorProps['onChange'] = (fontSize: FontSizeOption) => {
    onChange(
      produce(value, (draft: StatChartOptions) => {
        draft.valueFontSize = fontSize;
      })
    );
  };

  const onHandlerColorChange: OptionsColorPickerProps['onColorChange'] = (color: string) => {
    let backgroundColor = '';
    backgroundColor =
      theme.palette.mode === 'light' && color === DEMONSTRATION_WHITE_BACKGROUND
        ? theme.palette.background.default
        : color;

    onChange(
      produce(value, (draft: StatChartOptions) => {
        draft.backgroundColor = backgroundColor;
      })
    );
  };

  const colorPickerSelectedColor = useMemo((): string => {
    if (value?.backgroundColor) return value?.backgroundColor;

    if (theme.palette.mode === 'dark') return theme.palette.background.default;

    /* The white color picker on the white editor panel form will be completely invisible
       So, let's make it slightly darker JUST for demonstration.   
    */
    return DEMONSTRATION_WHITE_BACKGROUND;
  }, [theme, value?.backgroundColor]);

  return (
    <OptionsEditorGrid>
      <OptionsEditorColumn>
        <OptionsEditorGroup title="Misc">
          <OptionsEditorControl
            label="Sparkline"
            control={<Switch checked={!!value.sparkline} onChange={handleSparklineChange} />}
          />
          <OptionsEditorControl
            label="Background color"
            control={
              <OptionsColorPicker
                label="Background color"
                color={colorPickerSelectedColor}
                onColorChange={onHandlerColorChange}
              />
            }
          />
          <FormatControls value={format} onChange={handleUnitChange} />
          <CalculationSelector value={value.calculation} onChange={handleCalculationChange} />
          <MetricLabelInput value={value.metricLabel} onChange={handleMetricLabelChange} />
          <FontSizeSelector value={value.valueFontSize} onChange={handleFontSizeChange} />
        </OptionsEditorGroup>
      </OptionsEditorColumn>
      <OptionsEditorColumn>
        <ThresholdsEditor disablePercentMode thresholds={value.thresholds} onChange={handleThresholdsChange} />
      </OptionsEditorColumn>
    </OptionsEditorGrid>
  );
}
