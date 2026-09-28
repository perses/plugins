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
import type { RenderResult } from '@testing-library/react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';

import { createInitialPieChartOptions, DEFAULT_VISUAL } from './pie-chart-model';
import type { PieChartOptions, PieChartVisualOptions } from './pie-chart-model';
import { PieChartOptionsEditorSettings } from './PieChartOptionsEditorSettings';

interface ControlledEditorProps {
  initialValue: PieChartOptions;
  onChange: (value: PieChartOptions) => void;
}

function ControlledEditor({ initialValue, onChange }: ControlledEditorProps): ReactElement {
  const [value, setValue] = useState(initialValue);
  const handleChange = useCallback(
    (nextValue: PieChartOptions): void => {
      setValue(nextValue);
      onChange(nextValue);
    },
    [onChange],
  );
  return <PieChartOptionsEditorSettings value={value} onChange={handleChange} />;
}

function renderEditor(value: PieChartOptions = createInitialPieChartOptions(), onChange = vi.fn()): RenderResult {
  return render(
    <ChartsProvider chartsTheme={testChartsTheme}>
      <ControlledEditor initialValue={value} onChange={onChange} />
    </ChartsProvider>,
  );
}

function getOuterRadius(): HTMLInputElement {
  return screen.getByRole('slider', { name: 'Outer Radius slider' });
}

function getInnerRadius(): HTMLInputElement {
  return screen.getByRole('slider', { name: 'Inner Radius slider' });
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

    fireEvent.change(getOuterRadius(), { target: { value: '75' } });

    expect(onChange).toHaveBeenLastCalledWith({
      calculation: legacyOptions.calculation,
      format: legacyOptions.format,
      mode: legacyOptions.mode,
      showLabels: true,
      sort: legacyOptions.sort,
      visual: {
        outerRadius: 75,
        colorPalette: ['#3366cc', '#dc3912'],
      },
    });
  });

  it('shows the default outer radius and no inner radius', () => {
    renderEditor();

    expect(getOuterRadius()).toHaveValue('100');
    expect(getInnerRadius()).toHaveValue('0');
  });

  it('updates radius controls when the persisted value changes', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <ChartsProvider chartsTheme={testChartsTheme}>
        <PieChartOptionsEditorSettings value={withVisual({ innerRadius: 20, outerRadius: 80 })} onChange={onChange} />
      </ChartsProvider>,
    );

    rerender(
      <ChartsProvider chartsTheme={testChartsTheme}>
        <PieChartOptionsEditorSettings value={withVisual({ innerRadius: 40, outerRadius: 75 })} onChange={onChange} />
      </ChartsProvider>,
    );

    expect(getOuterRadius()).toHaveValue('75');
    expect(getInnerRadius()).toHaveValue('40');

    fireEvent.change(getInnerRadius(), { target: { value: '45' } });
    expect(onChange).toHaveBeenLastCalledWith(withVisual({ innerRadius: 45, outerRadius: 75 }));
  });

  it('allows an outer radius of zero', () => {
    const onChange = vi.fn();
    renderEditor(createInitialPieChartOptions(), onChange);

    fireEvent.change(getOuterRadius(), { target: { value: '0' } });

    expect(onChange).toHaveBeenLastCalledWith(withVisual({ outerRadius: 0 }));
  });

  it('stores an inner radius for a doughnut chart', () => {
    const onChange = vi.fn();
    renderEditor(createInitialPieChartOptions(), onChange);

    fireEvent.change(getInnerRadius(), { target: { value: '40' } });

    expect(onChange).toHaveBeenLastCalledWith(withVisual({ innerRadius: 40, outerRadius: 100 }));
  });

  it('labels the inner and outer slider thumbs', () => {
    renderEditor();

    expect(getOuterRadius()).toHaveAttribute('aria-valuetext', 'Outer: 100%');
    expect(getInnerRadius()).toHaveAttribute('aria-valuetext', 'Inner: 0%');
    expect(screen.getByText('0%')).toBeVisible();
    expect(screen.getByText('100%')).toBeVisible();
  });

  it('insets the slider endpoints from the editor edges', () => {
    renderEditor();
    const sliderContainer = getInnerRadius().closest('.MuiSlider-root')?.parentElement;

    expect(sliderContainer).toHaveStyle({ paddingLeft: '24px', paddingRight: '24px' });
  });

  it('reserves space between radius marks and color controls', () => {
    renderEditor();
    const colorSchemeRow = screen.getAllByRole('combobox')[0]?.closest('.MuiStack-root');
    const colorSection = colorSchemeRow?.parentElement;

    expect(colorSection).toHaveStyle({ paddingTop: '24px' });
  });

  it('omits an inner radius of zero', () => {
    const onChange = vi.fn();
    renderEditor(withVisual({ innerRadius: 40, outerRadius: 90 }), onChange);

    fireEvent.change(getInnerRadius(), { target: { value: '0' } });

    expect(getInnerRadius()).toHaveValue('0');
    expect(onChange).toHaveBeenLastCalledWith(withVisual({ innerRadius: undefined, outerRadius: 90 }));
  });

  it('allows equal radii', () => {
    const onChange = vi.fn();
    renderEditor(withVisual({ innerRadius: 40, outerRadius: 75 }), onChange);

    fireEvent.change(getOuterRadius(), {
      target: { value: '40' },
    });

    expect(onChange).toHaveBeenLastCalledWith(withVisual({ innerRadius: 40, outerRadius: 40 }));
    expect(getOuterRadius()).toHaveValue('40');
  });

  it('previews a drag locally and commits when the drag ends', () => {
    const onChange = vi.fn();
    renderEditor(createInitialPieChartOptions(), onChange);
    const innerSlider = getInnerRadius();
    const sliderRoot = innerSlider.closest('.MuiSlider-root');
    if (!(sliderRoot instanceof HTMLElement)) {
      throw new Error('Expected the range slider to have a slider root');
    }
    vi.spyOn(sliderRoot, 'getBoundingClientRect').mockReturnValue({
      bottom: 10,
      height: 10,
      left: 0,
      right: 100,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => undefined,
    });

    fireEvent.mouseDown(sliderRoot, { button: 0, clientX: 25, clientY: 5 });

    expect(getInnerRadius()).toHaveValue('25');
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.mouseUp(document, { clientX: 25, clientY: 5 });

    expect(onChange).toHaveBeenLastCalledWith(withVisual({ innerRadius: 25, outerRadius: 100 }));
  });

  it('resets visual settings to their defaults', () => {
    const onChange = vi.fn();
    const value = {
      ...withVisual({
        innerRadius: 40,
        outerRadius: 90,
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
