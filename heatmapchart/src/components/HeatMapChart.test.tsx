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

import type * as Components from '@perses-dev/components';
import { ChartsProvider, EChart, testChartsTheme, TimeZoneProvider } from '@perses-dev/components';
import { render } from '@testing-library/react';
import type { CustomSeriesRenderItem, CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams } from 'echarts';

import { HeatMapChart } from './HeatMapChart';

vi.unmock('echarts/core');
vi.mock('@perses-dev/components', async (importOriginal) => ({
  ...(await importOriginal<typeof Components>()),
  EChart: vi.fn(() => null),
}));

it.each([
  ['inside the plot', 40, 60, 10, 80, { x: 40, y: 10, width: 20, height: 70 }],
  ['past the final time', 90, 110, 10, 80, { x: 90, y: 10, width: 10, height: 70 }],
  ['past both Y limits', 40, 60, -10, 110, { x: 40, y: 0, width: 20, height: 100 }],
  ['entirely past the final time', 110, 130, 10, 80, undefined],
  ['entirely above the Y limit', 40, 60, -30, -10, undefined],
])('clips buckets %s to the plot bounds', (_, startX, nextX, topY, bottomY, expectedShape) => {
  render(
    <ChartsProvider chartsTheme={testChartsTheme}>
      <TimeZoneProvider timeZone="UTC">
        <HeatMapChart width={500} height={300} data={[]} xAxisCategories={[]} showVisualMap />
      </TimeZoneProvider>
    </ChartsProvider>,
  );

  const option = vi.mocked(EChart).mock.calls.at(-1)?.[0].option as {
    series: [{ renderItem: CustomSeriesRenderItem }];
  };
  const params = {
    coordSys: { type: 'cartesian2d', x: 20, y: 0, width: 80, height: 100 },
  } as unknown as CustomSeriesRenderItemParams;
  const api = {
    value: vi.fn((dimension: number) => [4, 0, 10][dimension]),
    coord: vi
      .fn()
      .mockReturnValueOnce([startX, topY])
      .mockReturnValueOnce([startX, bottomY])
      .mockReturnValueOnce([nextX, topY]),
    visual: vi.fn(() => 'red'),
  } as unknown as CustomSeriesRenderItemAPI;

  const result = option.series[0].renderItem(params, api);
  if (expectedShape === undefined) {
    expect(result).toBeNull();
  } else {
    expect(result).toMatchObject({ type: 'rect', shape: expectedShape, style: { fill: 'red' } });
  }
});
