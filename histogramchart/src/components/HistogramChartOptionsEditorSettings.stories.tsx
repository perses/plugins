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

import React from 'react';
// eslint-disable-next-line storybook/no-renderer-packages
import { Meta, StoryFn } from '@storybook/react';
import { ChartsProvider } from '@perses-dev/components';
import { HistogramChartOptionsEditorProps } from '../histogram-chart-model';
import { HistogramChartOptionsEditorSettings } from './HistogramChartOptionsEditorSettings';

export default {
  title: 'Components/HistogramChartOptionsEditorSettings',
  component: HistogramChartOptionsEditorSettings,
} as Meta;

const Template: StoryFn<React.ComponentProps<typeof HistogramChartOptionsEditorSettings>> = (
  args: React.ComponentProps<typeof HistogramChartOptionsEditorSettings>
) => (
  <ChartsProvider
    chartsTheme={{
      echartsTheme: {},
      noDataOption: {},
      sparkline: {
        width: 2,
        color: '#FF0000',
      },
      container: {
        padding: {
          default: 0,
        },
      },
      thresholds: {
        defaultColor: '#000000',
        palette: ['#FF0000', '#00FF00', '#0000FF'],
      },
    }}
  >
    <HistogramChartOptionsEditorSettings {...args} />
  </ChartsProvider>
);

export const DEFAULT = Template.bind({});
DEFAULT.args = {
  format: { unit: 'decimal', decimalPlaces: 2 },
  value: {}, // Provide a valid value object based on HistogramChartOptions
  onChange: () => {}, // Provide a valid onChange function
} as HistogramChartOptionsEditorProps;
