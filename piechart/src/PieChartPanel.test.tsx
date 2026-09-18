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
import { render } from '@testing-library/react';

import type { PieChartOptions } from './pie-chart-model';
import type { PieChartBaseProps } from './PieChartBase';
import type { PieChartPanelProps } from './PieChartPanel';
import { PieChartPanel } from './PieChartPanel';

const { pieChartBaseSpy } = vi.hoisted(() => ({ pieChartBaseSpy: vi.fn() }));

vi.mock('./PieChartBase', () => ({
  PieChartBase: (props: PieChartBaseProps): null => {
    pieChartBaseSpy(props);
    return null;
  },
}));

const CONTENT_DIMENSIONS = { width: 500, height: 500 };
const LEGACY_SPEC = {
  calculation: 'last-number',
  radius: 50,
  showLabels: true,
  colorPalette: ['#3366cc', '#dc3912'],
} as PieChartOptions;
const LEGACY_QUERY_RESULTS: PieChartPanelProps['queryResults'] = [
  {
    definition: { kind: 'TestQuery', spec: { plugin: { kind: 'TestQuery', spec: {} } } },
    data: {
      timeRange: { start: new Date(0), end: new Date(1000) },
      stepMs: 1000,
      series: [{ name: 'requests', values: [[1000, 42]], labels: {} }],
    },
  },
];

describe('PieChartPanel', () => {
  it('renders legacy visual settings', () => {
    render(
      <ChartsProvider chartsTheme={testChartsTheme}>
        <PieChartPanel contentDimensions={CONTENT_DIMENSIONS} queryResults={LEGACY_QUERY_RESULTS} spec={LEGACY_SPEC} />
      </ChartsProvider>,
    );

    expect(pieChartBaseSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ itemStyle: { color: '#3366cc' } })],
        outerRadius: '90%',
        showLabels: true,
      }),
    );
  });
});
