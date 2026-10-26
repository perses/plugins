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
import type { TimeSeries } from '@perses-dev/spec';
import { render, screen } from '@testing-library/react';

import type { GaugeChartOptions } from './gauge-chart-model';
import type { GaugeChartBaseProps } from './GaugeChartBase';
import type { GaugeChartPanelProps } from './GaugeChartPanel';
import { GaugeChartPanel } from './GaugeChartPanel';

const { gaugeChartBaseSpy } = vi.hoisted(() => ({
  gaugeChartBaseSpy: vi.fn<(props: GaugeChartBaseProps) => void>(),
}));

vi.mock('./GaugeChartBase', () => ({
  GaugeChartBase: (props: GaugeChartBaseProps): null => {
    gaugeChartBaseSpy(props);
    return null;
  },
}));

function createPanelProps(values: number[], format: GaugeChartOptions['format']): GaugeChartPanelProps {
  return {
    contentDimensions: { width: 500, height: 300 },
    spec: { calculation: 'last-number', format },
    queryResults: [
      {
        definition: { kind: 'TimeSeriesQuery', spec: { plugin: { kind: 'TestQuery', spec: {} } } },
        data: {
          timeRange: { start: new Date(0), end: new Date(1000) },
          stepMs: 1000,
          series: values.map((value, index): TimeSeries => ({
            name: `series-${index}`,
            formattedName: `Series ${index}`,
            values: [[1000, value]],
          })),
        },
      },
    ],
  };
}

function renderPanel(values: number[], format: GaugeChartOptions['format'] = { unit: 'percent-decimal' }): void {
  const props = createPanelProps(values, format);
  render(
    <ChartsProvider chartsTheme={testChartsTheme}>
      <GaugeChartPanel {...props} />
    </ChartsProvider>,
  );
}

describe('GaugeChartPanel', () => {
  beforeEach(() => {
    gaugeChartBaseSpy.mockClear();
  });

  it.each(['percent-decimal', 'datetime-iso'] as const)('shows an error before formatting NaN with %s', (unit) => {
    renderPanel([Number.NaN], { unit });

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid numeric value');
    expect(gaugeChartBaseSpy).not.toHaveBeenCalled();
  });

  it('only replaces the NaN gauge while preserving valid values, including zero', () => {
    renderPanel([0.5, Number.NaN, 0]);

    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid numeric value');
    expect(gaugeChartBaseSpy.mock.calls.map(([props]) => props.data.value)).toEqual([0.5, 0]);
  });
});
