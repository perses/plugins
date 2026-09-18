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
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';

import { createInitialPieChartOptions, DEFAULT_VISUAL } from './pie-chart-model';
import type { PieChartOptions, PieChartVisualOptions } from './pie-chart-model';
import { PieChartOptionsEditorSettings } from './PieChartOptionsEditorSettings';

function renderEditor(value: PieChartOptions = createInitialPieChartOptions(), onChange = vi.fn()): void {
  render(
    <ChartsProvider chartsTheme={testChartsTheme}>
      <PieChartOptionsEditorSettings value={value} onChange={onChange} />
    </ChartsProvider>,
  );
}

interface ControlledEditorProps {
  onChange: (value: PieChartOptions) => void;
}

function ControlledEditor({ onChange }: ControlledEditorProps): ReactElement {
  const [value, setValue] = useState(createInitialPieChartOptions);

  const handleChange = useCallback(
    (nextValue: PieChartOptions): void => {
      setValue(nextValue);
      onChange(nextValue);
    },
    [onChange],
  );

  return <PieChartOptionsEditorSettings value={value} onChange={handleChange} />;
}

function renderControlledEditor(onChange = vi.fn()): void {
  render(
    <ChartsProvider chartsTheme={testChartsTheme}>
      <ControlledEditor onChange={onChange} />
    </ChartsProvider>,
  );
}

function getOuterRadius(): HTMLInputElement {
  return screen.getByRole('textbox', { name: 'Outer Radius' });
}

function getInnerRadius(): HTMLInputElement {
  return screen.getByRole('textbox', { name: 'Inner Radius' });
}

function withVisual(visual: Partial<PieChartVisualOptions>): PieChartOptions {
  const initialOptions = createInitialPieChartOptions();
  return {
    ...initialOptions,
    visual: {
      ...DEFAULT_VISUAL,
      ...visual,
    },
  };
}

describe('PieChartOptionsEditorSettings', () => {
  it('renders a legacy chart without visual settings', () => {
    const legacyOptions: PieChartOptions = {
      ...createInitialPieChartOptions(),
      visual: undefined,
    };

    expect(() => renderEditor(legacyOptions)).not.toThrow();
  });

  it('moves legacy visual fields when saving a legacy chart', () => {
    const onChange = vi.fn();
    const legacyOptions: PieChartOptions & { radius: number; showLabels: boolean; colorPalette: string[] } = {
      ...createInitialPieChartOptions(),
      visual: undefined,
      radius: 50,
      showLabels: true,
      colorPalette: ['#3366cc', '#dc3912'],
    };
    renderEditor(legacyOptions, onChange);

    fireEvent.change(getOuterRadius(), { target: { value: '75%' } });

    expect(onChange).toHaveBeenLastCalledWith({
      calculation: legacyOptions.calculation,
      format: legacyOptions.format,
      mode: legacyOptions.mode,
      showLabels: true,
      sort: legacyOptions.sort,
      visual: {
        outerRadius: '75%',
        colorPalette: ['#3366cc', '#dc3912'],
      },
    });
  });

  it('shows the default outer radius and no inner radius', () => {
    renderEditor();

    expect(getOuterRadius()).toHaveValue('90%');
    expect(getInnerRadius()).toHaveValue('');
  });

  it('stores a unitless outer radius', () => {
    const onChange = vi.fn();
    renderEditor(createInitialPieChartOptions(), onChange);

    fireEvent.change(getOuterRadius(), { target: { value: '200' } });

    expect(onChange).toHaveBeenLastCalledWith(withVisual({ outerRadius: '200' }));
  });

  it('keeps the outer radius focused while typing in a controlled editor', () => {
    const onChange = vi.fn();
    renderControlledEditor(onChange);

    const outerRadius = getOuterRadius();
    userEvent.clear(outerRadius);
    userEvent.type(outerRadius, '75%');

    expect(outerRadius).toHaveFocus();
    expect(outerRadius).toHaveValue('75%');
    expect(onChange).toHaveBeenLastCalledWith(withVisual({ outerRadius: '75%' }));
  });

  it('stores an inner radius for a doughnut chart', () => {
    const onChange = vi.fn();
    renderEditor(createInitialPieChartOptions(), onChange);

    fireEvent.change(getInnerRadius(), { target: { value: '40%' } });

    expect(onChange).toHaveBeenLastCalledWith(withVisual({ innerRadius: '40%', outerRadius: '90%' }));
  });

  it('restores the default when the required outer radius is left blank', () => {
    const onChange = vi.fn();
    renderEditor(createInitialPieChartOptions(), onChange);

    const outerRadius = getOuterRadius();
    fireEvent.change(outerRadius, { target: { value: '' } });
    fireEvent.blur(outerRadius);

    expect(onChange).toHaveBeenLastCalledWith(withVisual({ outerRadius: '90%' }));
  });

  it('displays unitless pixel radius values', () => {
    renderEditor(withVisual({ innerRadius: '40', outerRadius: '90%' }));

    expect(getInnerRadius()).toHaveValue('40');
    expect(getOuterRadius()).toHaveValue('90%');
  });

  it('resets visual settings to their defaults', () => {
    const onChange = vi.fn();
    const value = {
      ...withVisual({
        innerRadius: '40%',
        outerRadius: '90%',
        colorPalette: ['#3366cc'],
      }),
      showLabels: true,
    };
    renderEditor(value, onChange);

    fireEvent.click(screen.getByRole('button', { name: 'Reset To Defaults' }));

    expect(onChange).toHaveBeenLastCalledWith({
      ...value,
      showLabels: false,
      visual: { ...DEFAULT_VISUAL },
    });
  });
});
