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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { HistogramChartOptions } from '../histogram-chart-model';
import { HistogramChartOptionsEditorSettings } from './HistogramChartOptionsEditorSettings';

describe('HistogramChartOptionsEditorSettings', () => {
  const renderHistogramChartOptionsEditorSettings = (value: HistogramChartOptions, onChange = jest.fn()): void => {
    render(
      <ChartsProvider chartsTheme={testChartsTheme}>
        <HistogramChartOptionsEditorSettings value={value} onChange={onChange} />
      </ChartsProvider>
    );
  };

  it('can modify unit', () => {
    const onChange = jest.fn();
    renderHistogramChartOptionsEditorSettings(
      {
        format: {
          unit: 'decimal',
        },
      },
      onChange
    );
    const unitSelector = screen.getByRole('combobox', { name: 'Unit' });
    userEvent.click(unitSelector);
    const yearOption = screen.getByRole('option', {
      name: 'Years',
    });
    userEvent.click(yearOption);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        format: {
          unit: 'years',
        },
      })
    );
  });

  it('can modify min', async () => {
    let minValue: number | undefined = undefined;
    const onChange = jest.fn((e) => {
      minValue = e.min;
    });
    renderHistogramChartOptionsEditorSettings(
      {
        format: {
          unit: 'decimal',
        },
        min: 1,
      },
      onChange
    );
    const minInput = await screen.findByLabelText(/Min/);
    expect(minInput).toBeInTheDocument();
    userEvent.clear(minInput);
    userEvent.type(minInput, '5');
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(minValue).toBe(5);
  });

  it('can modify max', async () => {
    let maxValue: number | undefined = undefined;
    const onChange = jest.fn((e) => {
      maxValue = e.max;
    });
    renderHistogramChartOptionsEditorSettings(
      {
        format: {
          unit: 'decimal',
        },
        max: 1,
      },
      onChange
    );
    const maxInput = await screen.findByLabelText(/Max/);
    expect(maxInput).toBeInTheDocument();
    userEvent.clear(maxInput);
    userEvent.type(maxInput, '5');
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(maxValue).toBe(5);
  });
});
