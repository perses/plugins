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
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { TimeSeriesChartVisualOptions } from './time-series-chart-model';
import { CATEGORICAL_SCHEME_METADATA, VISUAL_CONFIG } from './time-series-chart-model';
import { VisualOptionsEditor } from './VisualOptionsEditor';

describe('VisualOptionsEditor', () => {
  const renderVisualOptionsEditor = (value: TimeSeriesChartVisualOptions, onChange = vi.fn()): void => {
    render(
      <ChartsProvider chartsTheme={testChartsTheme}>
        <VisualOptionsEditor value={value} onChange={onChange} />
      </ChartsProvider>,
    );
  };

  const getLineWidthSlider = (): HTMLElement => {
    return screen.getByTestId(VISUAL_CONFIG.lineWidth.testId);
  };

  it('can update the line width visual option', () => {
    const onChange = vi.fn();
    renderVisualOptionsEditor({ display: 'line', lineWidth: 3, pointRadius: 2 }, onChange);

    expect(screen.getByText(VISUAL_CONFIG.lineWidth.label)).toBeInTheDocument();

    const sliderInput = getLineWidthSlider();

    // MUI Slider computes the return value based on span elements, mock initial position
    sliderInput.getBoundingClientRect = vi.fn(() => {
      return {
        bottom: 200,
        height: 30,
        left: 20,
        right: 500,
        top: 250,
        width: 550,
        x: 20,
        y: 250,
        toJSON: (): Record<string, unknown> => ({}),
      };
    });
    expect(sliderInput).toBeInTheDocument();

    // to move slider and update visual options
    fireEvent.mouseDown(sliderInput, { clientX: 220, clientY: 100 });
    expect(onChange).toHaveBeenCalledWith({ display: 'line', lineWidth: 1.25, pointRadius: 2.75 });
  });

  it('hides line-specific controls when display is bar', () => {
    renderVisualOptionsEditor({ display: 'bar', lineWidth: 3, pointRadius: 2 });

    // Line width control should not be present
    expect(screen.queryByText(VISUAL_CONFIG.lineWidth.label)).not.toBeInTheDocument();

    // Area opacity control should not be present
    expect(screen.queryByText(VISUAL_CONFIG.areaOpacity.label)).not.toBeInTheDocument();

    // Connect nulls control should not be present
    expect(screen.queryByText(VISUAL_CONFIG.connectNulls.label)).not.toBeInTheDocument();
  });

  describe('Color Palette', () => {
    it('renders the color palette label', () => {
      renderVisualOptionsEditor({});
      expect(screen.getByText(VISUAL_CONFIG.colorPalette.label)).toBeInTheDocument();
    });

    it('shows the named palette label when name is set', () => {
      renderVisualOptionsEditor({ palette: { mode: 'categorical', name: 'tableau10' } });
      expect(screen.getByRole('combobox', { name: VISUAL_CONFIG.colorPalette.label })).toHaveValue(
        CATEGORICAL_SCHEME_METADATA.tableau10.label,
      );
    });

    it('calls onChange with auto mode when Auto is selected', async () => {
      const onChange = vi.fn();
      renderVisualOptionsEditor({ palette: { mode: 'categorical' } }, onChange);

      await userEvent.click(screen.getByRole('combobox', { name: VISUAL_CONFIG.colorPalette.label }));
      await userEvent.click(screen.getByRole('option', { name: 'Auto' }));

      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ palette: { mode: 'auto' } }));
    });

    it('calls onChange with categorical mode and no name when Theme colors is selected', async () => {
      const onChange = vi.fn();
      renderVisualOptionsEditor({ palette: { mode: 'auto' } }, onChange);

      await userEvent.click(screen.getByRole('combobox', { name: VISUAL_CONFIG.colorPalette.label }));
      await userEvent.click(screen.getByRole('option', { name: 'Theme colors' }));

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ palette: { mode: 'categorical', name: undefined } }),
      );
    });

    it('calls onChange with the selected named palette', async () => {
      const onChange = vi.fn();
      renderVisualOptionsEditor({ palette: { mode: 'auto' } }, onChange);

      await userEvent.click(screen.getByRole('combobox', { name: VISUAL_CONFIG.colorPalette.label }));
      await userEvent.click(screen.getByRole('option', { name: CATEGORICAL_SCHEME_METADATA.dark2.label }));

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ palette: { mode: 'categorical', name: 'dark2' } }),
      );
    });
  });
});
