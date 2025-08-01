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

import { ChartsProvider, testChartsTheme } from '@perses-dev/components';
import { fireEvent, render, screen } from '@testing-library/react';
import React, { act } from 'react';
import { DEFAULT_FORMAT, HeatMapChartOptions } from '../heat-map-chart-model';
import { HeatMapChartOptionsEditorSettings } from './HeatMapChartOptionsEditorSettings';

describe('HeatMapChartOptionsEditorSettings', () => {
  const renderHeatMapChartOptionsEditorSettings = (value: HeatMapChartOptions, onChange = jest.fn()): void => {
    render(
      <ChartsProvider chartsTheme={testChartsTheme}>
        <HeatMapChartOptionsEditorSettings value={value} onChange={onChange} />
      </ChartsProvider>
    );
  };

  it('can modify visual map', async () => {
    let showVisualMap: boolean | undefined = false;
    const onChange = jest.fn((e) => {
      showVisualMap = e.showVisualMap;
    });
    renderHeatMapChartOptionsEditorSettings(
      {
        yAxisFormat: DEFAULT_FORMAT,
        countFormat: DEFAULT_FORMAT,
        showVisualMap: false,
      },
      onChange
    );
    const showVisualMapSwitch = await screen.findByLabelText(/Show Visual Map/);
    expect(showVisualMapSwitch).toBeInTheDocument();
    act(() => {
      fireEvent.click(showVisualMapSwitch);
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(showVisualMap).toBe(true);
  });
});
