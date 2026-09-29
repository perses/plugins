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
import type { TimeSeries } from '@perses-dev/spec';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ECharts } from 'echarts/core';
import { init } from 'echarts/core';
import type { ReactElement } from 'react';
import useResizeObserver from 'use-resize-observer';

import type { TimeChartProps } from './TimeSeriesChartBase';
import { TimeSeriesChartBase } from './TimeSeriesChartBase';
import type { ExemplarChartData } from './utils/data-transform';

vi.mock('@perses-dev/components', async (importOriginal) => ({
  ...(await importOriginal<typeof ComponentsModule>()),
  TimeChartTooltip: (): ReactElement => <div role="tooltip">Series tooltip</div>,
  ExemplarMetadataTooltip: ({ onUnpinClick }: { onUnpinClick?: () => void }): ReactElement => (
    <div role="tooltip">
      Exemplar tooltip<button onClick={onUnpinClick}>Unpin exemplar</button>
    </div>
  ),
}));

vi.mock('use-resize-observer', () => ({ default: vi.fn(() => ({ ref: vi.fn() })) }));

const DATA: TimeSeries[] = [
  {
    name: 'series',
    values: [
      [0, null],
      [1000, 2],
    ],
  },
];
const SERIES_MAPPING = [{ id: 'series', type: 'line' as const, datasetIndex: 0 }];
const TIME_SCALE = { startMs: 0, endMs: 1000, stepMs: 1000, rangeMs: 1000 };
const EXEMPLARS: ExemplarChartData[] = [
  {
    seriesId: 'series',
    seriesName: 'series',
    color: 'red',
    exemplars: [{ timestamp: 1000, value: 2, labels: { trace_id: 'trace-1' } }],
  },
];

function chartElement(props: Partial<TimeChartProps> = {}): ReactElement {
  return (
    <ChartsProvider chartsTheme={testChartsTheme}>
      <TimeSeriesChartBase height={300} data={DATA} seriesMapping={SERIES_MAPPING} timeScale={TIME_SCALE} {...props} />
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

describe('TimeSeriesChartBase performance', () => {
  it('reuses chart options while hovering, pinning, and unpinning an exemplar', () => {
    const chart = mockChart();
    const { container } = render(chartElement({ exemplars: EXEMPLARS }));
    const option = chart.setOption.mock.calls.at(-1)?.[0];
    const marker = option.series.find((series: { type: string }) => series.type === 'scatter');
    expect(marker).toBeDefined();
    const mouseover = chart.on.mock.calls.find(([event]) => event === 'mouseover')?.[1];
    expect(mouseover).toBeTypeOf('function');
    chart.resize.mockClear();
    chart.setOption.mockClear();
    act(() =>
      mouseover({
        componentType: 'series',
        seriesType: 'scatter',
        seriesId: marker.id,
        data: marker.data[0],
      }),
    );
    expect(screen.getByRole('tooltip')).toHaveTextContent('Exemplar tooltip');
    const wrapper = container.firstElementChild;
    if (!(wrapper instanceof HTMLElement)) throw new Error('Chart wrapper is missing');
    const canvas = document.createElement('canvas');
    wrapper.appendChild(canvas);
    fireEvent.click(canvas);
    fireEvent.mouseLeave(wrapper);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Exemplar tooltip');
    fireEvent.click(screen.getByRole('button', { name: 'Unpin exemplar' }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Series tooltip');
    expect(chart.resize).not.toHaveBeenCalled();
    expect(chart.setOption).not.toHaveBeenCalled();
  });

  it('does not resize or update chart options when hovering and leaving', () => {
    const chart = mockChart();
    const { container } = render(chartElement());
    chart.resize.mockClear();
    chart.setOption.mockClear();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    const wrapper = container.firstElementChild;
    if (!(wrapper instanceof HTMLElement)) throw new Error('Chart wrapper is missing');

    fireEvent.mouseEnter(wrapper);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.mouseLeave(wrapper);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(chart.resize).not.toHaveBeenCalled();
    expect(chart.setOption).not.toHaveBeenCalled();
  });

  it('resizes for changed container dimensions, including width-only changes', () => {
    const chart = mockChart();
    render(chartElement());
    chart.resize.mockClear();
    const onResize = vi.mocked(useResizeObserver).mock.calls.at(-1)?.[0]?.onResize;
    expect(onResize).toBeDefined();
    onResize?.({ width: 500, height: 300 });
    expect(chart.resize).not.toHaveBeenCalled();
    onResize?.({ width: 800, height: 300 });
    expect(chart.resize).toHaveBeenLastCalledWith({ width: 800, height: 300 });
    onResize?.({ width: 800, height: 400 });
    expect(chart.resize).toHaveBeenLastCalledWith({ width: 800, height: 400 });
  });

  it('reuses datasets across axis updates and preserves null samples without copying them', () => {
    const chart = mockChart();
    const { rerender } = render(chartElement({ exemplars: EXEMPLARS }));
    const initialOption = chart.setOption.mock.calls[0]?.[0];
    expect(initialOption.dataset[0].source).toBe(DATA[0]?.values);
    expect(initialOption.dataset[0].source[0]).toEqual([0, null]);

    rerender(chartElement({ exemplars: EXEMPLARS, yAxis: { max: 10 } }));
    const updatedOption = chart.setOption.mock.calls.at(-1)?.[0];
    expect(updatedOption.yAxis[0].max).toBe(10);
    expect(updatedOption.dataset).toBe(initialOption.dataset);
    expect(updatedOption.series[1]).toBe(initialOption.series[1]);

    const group = EXEMPLARS[0];
    if (!group) throw new Error('Exemplar fixture is missing');
    const refreshedExemplars = [
      {
        ...group,
        exemplars: [{ timestamp: 1000, value: 3, labels: { trace_id: 'trace-2' } }],
      },
    ];
    rerender(chartElement({ exemplars: refreshedExemplars, yAxis: { max: 10 } }));
    const refreshedOption = chart.setOption.mock.calls.at(-1)?.[0];
    expect(refreshedOption.dataset).toBe(initialOption.dataset);
    expect(refreshedOption.series[1].data[0]).toMatchObject({
      value: [1000, 3],
      exemplar: { labels: { trace_id: 'trace-2' } },
    });
  });
});
