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
import type * as Components from '@perses-dev/components';
import { render } from '@testing-library/react';

import type { PieChartData } from './PieChartBase';
import { PieChartBase } from './PieChartBase';

const { eChartSpy } = vi.hoisted(() => ({ eChartSpy: vi.fn() }));

vi.mock('@perses-dev/components', async (importOriginal) => {
  const components = await importOriginal<typeof Components>();
  return {
    ...components,
    EChart: (props: unknown): null => {
      eChartSpy(props);
      return null;
    },
  };
});

interface EChartProps {
  option: {
    series: Array<{
      radius: string | [string, string];
    }>;
  };
}

const DONUT_RADIUS: [string, string] = ['40%', '90%'];
const EMPTY_DATA: PieChartData[] = [];

describe('PieChartBase', () => {
  it('passes a scalar outer radius to ECharts for a pie chart', () => {
    render(
      <ChartsProvider chartsTheme={testChartsTheme}>
        <PieChartBase width={400} height={300} data={EMPTY_DATA} outerRadius="75%" />
      </ChartsProvider>,
    );

    const props = eChartSpy.mock.lastCall?.[0] as EChartProps;
    expect(props.option.series[0]?.radius).toBe('75%');
  });

  it('passes a doughnut radius to ECharts', () => {
    render(
      <ChartsProvider chartsTheme={testChartsTheme}>
        <PieChartBase width={400} height={300} data={EMPTY_DATA} innerRadius="40%" outerRadius="90%" />
      </ChartsProvider>,
    );

    const props = eChartSpy.mock.lastCall?.[0] as EChartProps;
    expect(props.option.series[0]?.radius).toEqual(DONUT_RADIUS);
  });
});
