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

import { ChartsProvider, testChartsTheme } from '@perses-dev/components';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';

import type { GaugeChartOptions } from './gauge-chart-model';
import { GaugeChartOptionsEditorSettings } from './GaugeChartOptionsEditorSettings';

// Keeps the options in state, like a real parent of this controlled editor
function StatefulGaugeChartOptionsEditorSettings({
  initialValue,
  onChange,
}: {
  initialValue: GaugeChartOptions;
  onChange: (value: GaugeChartOptions) => void;
}): ReactElement {
  const [value, setValue] = useState(initialValue);
  const handleChange = useCallback(
    (next: GaugeChartOptions): void => {
      setValue(next);
      onChange(next);
    },
    [onChange],
  );
  return (
    <ChartsProvider chartsTheme={testChartsTheme}>
      <GaugeChartOptionsEditorSettings value={value} onChange={handleChange} />
    </ChartsProvider>
  );
}

describe('GaugeChartOptionsEditorSettings', () => {
  const renderGaugeChartOptionsEditorSettings = (value: GaugeChartOptions, onChange = vi.fn()): void => {
    render(<StatefulGaugeChartOptionsEditorSettings initialValue={value} onChange={onChange} />);
  };

  it('can modify unit', () => {
    const onChange = vi.fn();
    renderGaugeChartOptionsEditorSettings(
      {
        format: {
          unit: 'decimal',
        },
        calculation: 'first',
      },
      onChange,
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
      }),
    );
  });

  it('can modify calculation', () => {
    const onChange = vi.fn();
    renderGaugeChartOptionsEditorSettings(
      {
        format: {
          unit: 'days',
        },
        calculation: 'first',
      },
      onChange,
    );
    const calcSelector = screen.getByRole('combobox', { name: 'Calculation' });
    userEvent.click(calcSelector);
    const meanOption = screen.getByRole('option', {
      name: /Average/,
    });
    userEvent.click(meanOption);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        calculation: 'mean',
      }),
    );
  });

  it('can modify max', async () => {
    let maxValue: number | undefined = undefined;
    const onChange = vi.fn((e) => {
      maxValue = e.max;
    });
    renderGaugeChartOptionsEditorSettings(
      {
        format: {
          unit: 'decimal',
        },
        max: 1,
        calculation: 'last-number',
      },
      onChange,
    );
    const maxInput = await screen.findByRole('spinbutton', { name: /Max/ });
    expect(maxInput).toBeInTheDocument();
    userEvent.clear(maxInput);
    userEvent.type(maxInput, '5');
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(maxValue).toBe(5);
  });
});
