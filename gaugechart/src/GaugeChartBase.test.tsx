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
import { init } from 'echarts/core';

import { GaugeChartBase } from './GaugeChartBase';

it.each([
  [0, 'green'],
  [70, 'green'],
  [71, 'orange'],
  [90, 'orange'],
  [91, 'red'],
  [120, 'red'],
  [-10, 'green'],
])('preserves the threshold color of the progress arc for %s', (value, color) => {
  const setOption = vi.fn();
  vi.mocked(init).mockReturnValue({
    setOption,
    resize: vi.fn(),
    dispose: vi.fn(),
  } as unknown as ReturnType<typeof init>);

  render(
    <ChartsProvider chartsTheme={testChartsTheme}>
      <GaugeChartBase
        width={500}
        height={300}
        data={{ value, label: 'CPU' }}
        format={{ unit: 'percent' }}
        axisLine={{
          lineStyle: {
            color: [
              [0.7, 'green'],
              [0.9, 'orange'],
              [1, 'red'],
            ],
          },
        }}
        max={100}
        valueFontSize="24px"
        progressWidth={18}
        titleFontSize={14}
      />
    </ChartsProvider>,
  );

  expect(setOption.mock.calls[0]?.[0].series[0].progress.itemStyle.color).toBe(color);
  expect(setOption.mock.calls[0]?.[0].series[0].axisLine.lineStyle.color).toEqual([[1, 'rgba(127,127,127,0.35)']]);
});
