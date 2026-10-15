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

import type * as ComponentsModule from '@perses-dev/components';
import { ChartsProvider, testChartsTheme } from '@perses-dev/components';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ECharts } from 'echarts/core';
import { init } from 'echarts/core';
import type { ReactElement } from 'react';

import type { HeatMapExemplarDataItem } from '../utils';
import { getExemplarScatterSeries } from '../utils';
import type { HeatMapDataItem, HeatMapChartProps } from './HeatMapChart';
import { HeatMapChart } from './HeatMapChart';

vi.mock('@perses-dev/components', async (importOriginal) => ({
  ...(await importOriginal<typeof ComponentsModule>()),
  ExemplarMetadataTooltip: ({ onUnpinClick }: { onUnpinClick?: () => void }): ReactElement => (
    <div role="tooltip">
      Exemplar tooltip<button onClick={onUnpinClick}>Unpin exemplar</button>
    </div>
  ),
}));

const DATA: HeatMapDataItem[] = [
  { value: [0, 0.1, 0.2, 4], label: '4' },
  { value: [1, 0.1, 0.2, 6], label: '6' },
];

const CATEGORIES = [0, 60_000];

const EXEMPLARS: HeatMapExemplarDataItem[] = [
  {
    value: [0, 0.15],
    exemplar: { labels: { trace_id: 'trace-1' }, value: 0.15, timestamp: 5_000 },
    seriesLabels: { route: '/checkout' },
  },
  {
    value: [1, 0.18],
    exemplar: { labels: { trace_id: 'trace-2' }, value: 0.18, timestamp: 65_000 },
    seriesLabels: { route: '/checkout' },
  },
];

function chartElement(props: Partial<HeatMapChartProps> = {}): ReactElement {
  return (
    <ChartsProvider chartsTheme={testChartsTheme}>
      <HeatMapChart
        width={500}
        height={300}
        data={DATA}
        xAxisCategories={CATEGORIES}
        exemplars={EXEMPLARS}
        {...props}
      />
    </ChartsProvider>
  );
}

function mockChart(): {
  resize: ReturnType<typeof vi.fn>;
  setOption: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
} {
  const chart = {
    resize: vi.fn(),
    setOption: vi.fn(),
    getWidth: (): number => 500,
    getHeight: (): number => 300,
    containPixel: (): boolean => false,
    dispose: vi.fn(),
    isDisposed: (): boolean => false,
    on: vi.fn(),
    off: vi.fn(),
    dispatchAction: vi.fn(),
  };
  vi.mocked(init).mockReturnValue(chart as unknown as ECharts);
  return chart;
}

describe('HeatMapChart exemplars', () => {
  it('adds the exemplar scatter series on top of the heatmap series', () => {
    const chart = mockChart();
    render(chartElement());
    const option = chart.setOption.mock.calls.at(-1)?.[0];
    const heatmapSeries = option.series.find((series: { type: string }) => series.type === 'custom');
    const marker = option.series.find((series: { type: string }) => series.type === 'scatter');
    expect(heatmapSeries).toBeDefined();
    expect(marker).toBeDefined();
    // The exemplar scatter series renders after (above) the heatmap custom series.
    expect(option.series.indexOf(marker)).toBeGreaterThan(option.series.indexOf(heatmapSeries));
    // The visual map only colors the heatmap series.
    expect(option.visualMap.seriesIndex).toBe(0);
  });

  it('does not add the exemplar scatter series without exemplars', () => {
    const chart = mockChart();
    render(chartElement({ exemplars: undefined }));
    const option = chart.setOption.mock.calls.at(-1)?.[0];
    expect(option.series.find((series: { type: string }) => series.type === 'scatter')).toBeUndefined();
  });

  it('shows the exemplar tooltip on hover, pins it on click and unpins from the tooltip', () => {
    const chart = mockChart();
    const { container } = render(chartElement());

    const marker = getExemplarScatterSeries(EXEMPLARS);
    const mouseover = chart.on.mock.calls.find(([event]) => event === 'mouseover')?.[1];
    expect(mouseover).toBeTypeOf('function');
    act(() =>
      mouseover({
        componentType: 'series',
        seriesType: 'scatter',
        seriesId: marker.id,
        data: (marker.data as HeatMapExemplarDataItem[])[0],
      }),
    );
    expect(screen.getByRole('tooltip')).toHaveTextContent('Exemplar tooltip');

    // Clicking the canvas while hovering the marker pins the tooltip, and it stays
    // visible after the mouse leaves the chart.
    const wrapper = container.firstElementChild;
    if (!(wrapper instanceof HTMLElement)) throw new Error('Chart wrapper is missing');
    const canvas = document.createElement('canvas');
    wrapper.appendChild(canvas);
    fireEvent.click(canvas);
    fireEvent.mouseLeave(wrapper);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Exemplar tooltip');

    // Unpin from the button inside the tooltip.
    fireEvent.click(screen.getByRole('button', { name: 'Unpin exemplar' }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('unpins the pinned exemplar tooltip when clicking elsewhere on the canvas', () => {
    const chart = mockChart();
    const { container } = render(chartElement());

    const marker = getExemplarScatterSeries(EXEMPLARS);
    const mouseover = chart.on.mock.calls.find(([event]) => event === 'mouseover')?.[1];
    act(() =>
      mouseover({
        componentType: 'series',
        seriesType: 'scatter',
        seriesId: marker.id,
        data: (marker.data as HeatMapExemplarDataItem[])[0],
      }),
    );
    const wrapper = container.firstElementChild;
    if (!(wrapper instanceof HTMLElement)) throw new Error('Chart wrapper is missing');
    const canvas = document.createElement('canvas');
    wrapper.appendChild(canvas);
    fireEvent.click(canvas); // pin
    expect(screen.getByRole('tooltip')).toHaveTextContent('Exemplar tooltip');

    const mouseout = chart.on.mock.calls.find(([event]) => event === 'mouseout')?.[1];
    act(() => mouseout({ componentType: 'series', seriesType: 'scatter', seriesId: marker.id }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Exemplar tooltip'); // pinned stays
    fireEvent.click(canvas); // click elsewhere with no hover: unpins
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
