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
import { ChartsProvider, testChartsTheme, getTimeSeriesValues } from '@perses-dev/components';
import type * as DashboardsModule from '@perses-dev/dashboards';
import type { AnnotationSpecWithData } from '@perses-dev/dashboards';
import type * as PluginSystemModule from '@perses-dev/plugin-system';
import { TimeRangeContext, getCalculations } from '@perses-dev/plugin-system';
import type { TimeSeriesData, TimeRangeValue } from '@perses-dev/spec';
import { toAbsoluteTimeRange } from '@perses-dev/spec';
import { screen, render, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EChartsCoreOption, ScatterSeriesOption } from 'echarts';
import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';
import { VirtuosoMockContext } from 'react-virtuoso';

import { MOCK_TIME_SERIES_DATA_MULTIVALUE, MOCK_TIME_SERIES_EXEMPLARS } from './test/mock-query-results';

// jsdom has no canvas, so ECharts cannot render. Capture the option passed to
// the EChart component so tests can assert on the resulting series config.
const { lastChartOption } = vi.hoisted(() => ({
  lastChartOption: { current: undefined as EChartsCoreOption | undefined },
}));
vi.mock('@perses-dev/components', async (importOriginal) => {
  const actual = await importOriginal<typeof ComponentsModule>();
  return {
    ...actual,
    getTimeSeriesValues: vi.fn(actual.getTimeSeriesValues),
    EChart: (props: { option: EChartsCoreOption }): ReactElement => {
      lastChartOption.current = props.option;
      return <div data-testid="echart-mock" />;
    },
  };
});
import type { TimeSeriesChartProps } from './TimeSeriesChartPanel';
import { TimeSeriesChartPanel } from './TimeSeriesChartPanel';

// These tests exercise legend rendering, not annotations. The panel calls usePanelAnnotationsWithData,
// which pulls in the full dashboard runtime (plugin registry, datasource store, query client). Mock it to
// return no annotations so the panel can render without wiring those providers here.
vi.mock('@perses-dev/dashboards', async (importOriginal) => ({
  ...(await importOriginal<typeof DashboardsModule>()),
  usePanelAnnotationsWithData: (): AnnotationSpecWithData[] => [],
}));

vi.mock('@perses-dev/plugin-system', async (importOriginal) => {
  const original = await importOriginal<typeof PluginSystemModule>();
  return { ...original, getCalculations: vi.fn(original.getCalculations) };
});

const TEST_TIME_RANGE: TimeRangeValue = { pastDuration: '1h' };

const TEST_TIME_SERIES_PANEL: Omit<TimeSeriesChartProps, 'queryResults'> = {
  contentDimensions: {
    width: 500,
    height: 500,
  },
  spec: {
    legend: {
      position: 'right',
    },
    yAxis: {
      format: { unit: 'decimal', decimalPlaces: 2 },
    },
  },
};

const TEST_QUERY_DEFINITION = {
  kind: 'TimeSeriesQuery',
  spec: {
    plugin: {
      kind: 'PrometheusTimeSeriesQuery',
      spec: {
        query: '',
      },
    },
  },
};

function getLegendByName(name?: string): HTMLElement {
  if (typeof name !== 'string') {
    throw new Error('Legend name must be a string.');
  }

  return screen.getByRole('listitem', {
    name: (content, element) => {
      return element.innerHTML.includes(name);
    },
  });
}

// PanelContent recreates these wrappers when dashboard hover/focus state changes.
function HoveringPanelHost(props: TimeSeriesChartProps): ReactElement {
  const [hovered, setHovered] = useState(false);
  const onMouseEnter = useCallback(() => setHovered(true), []);
  const onMouseLeave = useCallback(() => setHovered(false), []);
  const queryResults = props.queryResults.map(({ data, definition }) => ({ data, definition }));
  return (
    <>
      <button
        type="button"
        aria-label={hovered ? 'Hovered panel' : 'Panel'}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        Panel header
      </button>
      <TimeSeriesChartPanel {...props} queryResults={queryResults} />
    </>
  );
}

describe('TimeSeriesChartPanel', () => {
  // Helper to render the panel with some context set
  const renderPanel = (
    data = MOCK_TIME_SERIES_DATA_MULTIVALUE,
    spec: TimeSeriesChartProps['spec'] = TEST_TIME_SERIES_PANEL.spec,
    additionalData: TimeSeriesData[] = [],
  ): { rerenderPanel: (overrides: Partial<TimeSeriesChartProps>) => void } => {
    const mockTimeRangeContext = {
      refreshIntervalInMs: 0,
      setRefreshInterval: (): Record<string, unknown> => ({}),
      timeRange: TEST_TIME_RANGE,
      setTimeRange: (): Record<string, unknown> => ({}),
      absoluteTimeRange: toAbsoluteTimeRange(TEST_TIME_RANGE),
      refresh: vi.fn(),
    };

    const panelProps: TimeSeriesChartProps = {
      ...TEST_TIME_SERIES_PANEL,
      spec,
      queryResults: [data, ...additionalData].map((queryData) => ({
        definition: TEST_QUERY_DEFINITION,
        data: queryData,
      })),
    };
    const wrapPanel = (nextProps: TimeSeriesChartProps): ReactElement => (
      <VirtuosoMockContext.Provider value={{ viewportHeight: 600, itemHeight: 100 }}>
        <ChartsProvider chartsTheme={testChartsTheme}>
          <TimeRangeContext.Provider value={mockTimeRangeContext}>
            <HoveringPanelHost {...nextProps} />
          </TimeRangeContext.Provider>
        </ChartsProvider>
      </VirtuosoMockContext.Provider>
    );
    const view = render(wrapPanel(panelProps));
    return {
      rerenderPanel: (overrides: Partial<TimeSeriesChartProps>): void => {
        view.rerender(wrapPanel({ ...panelProps, ...overrides }));
      },
    };
  };

  it('reuses prepared data when dashboard hover recreates query wrappers', () => {
    vi.mocked(getTimeSeriesValues).mockClear();
    vi.mocked(getCalculations).mockClear();
    renderPanel(
      { ...MOCK_TIME_SERIES_DATA_MULTIVALUE, exemplars: MOCK_TIME_SERIES_EXEMPLARS },
      {
        ...TEST_TIME_SERIES_PANEL.spec,
        legend: { position: 'right', mode: 'list', values: ['mean'] },
      },
    );
    const samplePasses = vi.mocked(getTimeSeriesValues).mock.calls.length;
    const calculationPasses = vi.mocked(getCalculations).mock.calls.length;
    const initialOption = lastChartOption.current;
    expect(samplePasses).toBe(MOCK_TIME_SERIES_DATA_MULTIVALUE.series.length);
    expect(calculationPasses).toBe(samplePasses);
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Panel' }));
    fireEvent.mouseLeave(screen.getByRole('button', { name: 'Hovered panel' }));
    expect(getTimeSeriesValues).toHaveBeenCalledTimes(samplePasses);
    expect(getCalculations).toHaveBeenCalledTimes(calculationPasses);
    expect(lastChartOption.current).toBe(initialOption);
  });

  it('renders refreshed samples and exemplars after skipping unchanged query wrappers', () => {
    const data: TimeSeriesData = {
      timeRange: { start: new Date(0), end: new Date(1000) },
      stepMs: 1000,
      series: [
        {
          name: 'requests',
          labels: { job: 'api' },
          values: [
            [0, 1],
            [1000, 2],
          ],
        },
      ],
      exemplars: [
        { seriesLabels: { job: 'api' }, exemplars: [{ timestamp: 1000, value: 2, labels: { trace_id: 'old' } }] },
      ],
    };
    const { rerenderPanel } = renderPanel(data);
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Panel' }));
    const updatedData: TimeSeriesData = {
      ...data,
      timeRange: { start: new Date(0), end: new Date(2000) },
      series: [
        {
          name: 'requests',
          labels: { job: 'api' },
          values: [
            [0, 1],
            [1000, 2],
            [2000, 3],
          ],
        },
      ],
      exemplars: [
        { seriesLabels: { job: 'api' }, exemplars: [{ timestamp: 2000, value: 3, labels: { trace_id: 'new' } }] },
      ],
    };
    rerenderPanel({ queryResults: [{ definition: TEST_QUERY_DEFINITION, data: updatedData }] });
    expect(lastChartOption.current).toMatchObject({
      xAxis: { max: 2000 },
      dataset: [
        {
          source: [
            [0, 1],
            [1000, 2],
            [2000, 3],
          ],
        },
      ],
      series: [
        { type: 'line' },
        { type: 'scatter', data: [{ value: [2000, 3], exemplar: { labels: { trace_id: 'new' } } }] },
      ],
    });
  });

  it('updates when queries are reordered, removed, or their definitions change', () => {
    const first: TimeSeriesData = {
      ...MOCK_TIME_SERIES_DATA_MULTIVALUE,
      series: [{ name: 'first', values: [[0, 1]] }],
    };
    const second: TimeSeriesData = { ...first, series: [{ name: 'second', values: [[0, 2]] }] };
    const { rerenderPanel } = renderPanel(first, TEST_TIME_SERIES_PANEL.spec, [second]);
    rerenderPanel({ queryResults: [second, first].map((data) => ({ data, definition: TEST_QUERY_DEFINITION })) });
    expect(lastChartOption.current).toMatchObject({ series: [{ name: 'second' }, { name: 'first' }] });
    rerenderPanel({ queryResults: [{ data: second, definition: TEST_QUERY_DEFINITION }] });
    expect(lastChartOption.current?.series).toHaveLength(1);
    expect(screen.queryByText('first')).not.toBeInTheDocument();
    vi.mocked(getTimeSeriesValues).mockClear();
    rerenderPanel({ queryResults: [{ data: second, definition: { ...TEST_QUERY_DEFINITION } }] });
    expect(getTimeSeriesValues).toHaveBeenCalledTimes(1);
    rerenderPanel({ queryResults: [] });
    expect(screen.queryByText('second')).not.toBeInTheDocument();
  });

  it('applies spec changes and resizes with unchanged query data', () => {
    const { rerenderPanel } = renderPanel();
    const spec: TimeSeriesChartProps['spec'] = {
      ...TEST_TIME_SERIES_PANEL.spec,
      visual: { lineWidth: 5 },
      querySettings: [{ queryIndex: 0, negativeY: true }],
    };
    rerenderPanel({ spec });
    expect(lastChartOption.current).toMatchObject({
      series: [{ lineStyle: { width: 5 } }, { lineStyle: { width: 5 } }],
    });
    const chartContainer = screen.getByTestId('echart-mock').parentElement;
    const previousHeight = chartContainer?.style.height;
    rerenderPanel({ spec, contentDimensions: { width: 700, height: 700 } });
    expect(chartContainer?.style.height).not.toBe(previousHeight);
    rerenderPanel({ contentDimensions: undefined });
    expect(screen.queryByTestId('echart-mock')).not.toBeInTheDocument();
  });

  describe('exemplars', () => {
    const getExemplarSeries = (): ScatterSeriesOption[] => {
      const allSeries = lastChartOption.current?.series as ScatterSeriesOption[] | undefined;
      return (allSeries ?? []).filter((series) => typeof series.id === 'string' && series.id.startsWith('exemplar-'));
    };

    it('should render exemplars as diamond scatter series with embedded metadata', async () => {
      renderPanel({ ...MOCK_TIME_SERIES_DATA_MULTIVALUE, exemplars: MOCK_TIME_SERIES_EXEMPLARS });
      const exemplarSeries = await waitFor(() => {
        const series = getExemplarSeries();
        expect(series).toHaveLength(2);
        return series;
      });

      expect(exemplarSeries).toHaveLength(2);
      for (const series of exemplarSeries) {
        expect(series.type).toEqual('scatter');
        expect(series.symbol).toEqual('diamond');
      }

      const vda1Series = exemplarSeries[0];
      expect(vda1Series?.data?.[0]).toMatchObject({
        exemplar: MOCK_TIME_SERIES_EXEMPLARS[0]?.exemplars[0],
        seriesLabels: MOCK_TIME_SERIES_EXEMPLARS[0]?.seriesLabels,
      });
    });

    it('should not render exemplar series when the query data has no exemplars', async () => {
      renderPanel();
      await screen.findByText(
        'device="/dev/vda1", env="demo", fstype="ext4", instance="demo.do.prometheus.io:9100", job="node", mountpoint="/"',
      );
      expect(getExemplarSeries()).toHaveLength(0);
    });

    it('should only render exemplars of series selected in the legend', async () => {
      renderPanel({ ...MOCK_TIME_SERIES_DATA_MULTIVALUE, exemplars: MOCK_TIME_SERIES_EXEMPLARS });
      await waitFor(() => {
        expect(getExemplarSeries()).toHaveLength(2);
      });

      const initialSeries = getExemplarSeries();

      // NOTE: the project pins @testing-library/user-event v13, whose direct
      // `userEvent.click` API is synchronous (the v14 `setup()` API is not available).
      userEvent.click(getLegendByName(MOCK_TIME_SERIES_DATA_MULTIVALUE.series[0]?.name));

      await waitFor(() => {
        const exemplarSeries = getExemplarSeries();
        expect(exemplarSeries).toHaveLength(1);
        expect(exemplarSeries[0]?.id).toContain('vda1');
        expect(exemplarSeries[0]).toBe(initialSeries[0]);
      });
      userEvent.click(getLegendByName(MOCK_TIME_SERIES_DATA_MULTIVALUE.series[1]?.name));
      expect(getExemplarSeries()[0]).toBe(initialSeries[1]);
      userEvent.click(getLegendByName(MOCK_TIME_SERIES_DATA_MULTIVALUE.series[1]?.name), { shiftKey: true });
      expect(getExemplarSeries()).toHaveLength(0);
      userEvent.click(getLegendByName(MOCK_TIME_SERIES_DATA_MULTIVALUE.series[0]?.name));
      expect(getExemplarSeries()[0]).toBe(initialSeries[0]);
    });

    it('keeps exemplar matching query-local and preserves negative Y, color, and axis overrides', () => {
      const firstSeries = MOCK_TIME_SERIES_DATA_MULTIVALUE.series[0];
      const group = MOCK_TIME_SERIES_EXEMPLARS[0];
      if (!firstSeries || !group) throw new Error('Missing exemplar fixture');
      const data = {
        ...MOCK_TIME_SERIES_DATA_MULTIVALUE,
        series: [{ ...firstSeries, name: 'first query' }],
        exemplars: [group],
      };
      renderPanel(
        data,
        {
          ...TEST_TIME_SERIES_PANEL.spec,
          querySettings: [
            { queryIndex: 1, negativeY: true, colorMode: 'fixed', colorValue: '#ff0000', format: { unit: 'bytes' } },
          ],
        },
        [
          {
            ...data,
            series: [{ ...firstSeries, name: 'second query' }],
            exemplars: [
              { ...group, seriesLabels: Object.fromEntries(Object.entries(group.seriesLabels).toReversed()) },
            ],
          },
          { ...data, series: [] },
        ],
      );
      const initialSeries = getExemplarSeries();
      expect(initialSeries).toHaveLength(2);
      expect(initialSeries[1]).toMatchObject({ color: '#ff0000', yAxisIndex: 1 });
      expect(initialSeries[1]?.data?.[0]).toMatchObject({
        value: [group.exemplars[0]?.timestamp, -(group.exemplars[0]?.value ?? 0)],
        exemplar: group.exemplars[0],
      });
      userEvent.click(getLegendByName('first query'));
      expect(getExemplarSeries()).toEqual([initialSeries[0]]);
      userEvent.click(getLegendByName('second query'));
      expect(getExemplarSeries()[0]).toBe(initialSeries[1]);
    });
  });

  it('reuses sample arrays and legend statistics when selecting series', () => {
    vi.mocked(getTimeSeriesValues).mockClear();
    vi.mocked(getCalculations).mockClear();
    renderPanel(MOCK_TIME_SERIES_DATA_MULTIVALUE, {
      ...TEST_TIME_SERIES_PANEL.spec,
      legend: { position: 'right', mode: 'list', values: ['mean'] },
    });
    const samplePasses = vi.mocked(getTimeSeriesValues).mock.calls.length;
    const calculationPasses = vi.mocked(getCalculations).mock.calls.length;
    expect(samplePasses).toBe(MOCK_TIME_SERIES_DATA_MULTIVALUE.series.length);
    expect(calculationPasses).toBe(MOCK_TIME_SERIES_DATA_MULTIVALUE.series.length);

    const item = getLegendByName(MOCK_TIME_SERIES_DATA_MULTIVALUE.series[0]?.name);
    userEvent.click(item);
    expect(item).toHaveClass('Mui-selected');
    expect(getTimeSeriesValues).toHaveBeenCalledTimes(samplePasses);
    expect(getCalculations).toHaveBeenCalledTimes(calculationPasses);
  });

  it('should render the legend with unformatted series labels', async () => {
    renderPanel();
    expect(
      await screen.findByText(
        'device="/dev/vda1", env="demo", fstype="ext4", instance="demo.do.prometheus.io:9100", job="node", mountpoint="/"',
      ),
    ).toBeInTheDocument();
  });

  it('should toggle selected state when a legend item is clicked', async () => {
    renderPanel();

    const seriesArr = MOCK_TIME_SERIES_DATA_MULTIVALUE.series;
    const firstName = seriesArr[0]?.name;
    const secondName = seriesArr[1]?.name;

    userEvent.click(getLegendByName(firstName));
    expect(getLegendByName(firstName)).toHaveClass('Mui-selected');
    expect(getLegendByName(secondName)).not.toHaveClass('Mui-selected');

    userEvent.click(getLegendByName(secondName));
    expect(getLegendByName(firstName)).not.toHaveClass('Mui-selected');
    expect(getLegendByName(secondName)).toHaveClass('Mui-selected');
  });

  it('should modify selected state when a legend item is clicked with shift key', async () => {
    renderPanel();
    const seriesArr = MOCK_TIME_SERIES_DATA_MULTIVALUE.series;

    const firstName = seriesArr[0]?.name;
    const secondName = seriesArr[1]?.name;

    // Add first legend item
    userEvent.click(getLegendByName(firstName), {
      shiftKey: true,
    });
    expect(getLegendByName(firstName)).toHaveClass('Mui-selected');
    expect(getLegendByName(secondName)).not.toHaveClass('Mui-selected');

    // Add second legend item
    userEvent.click(getLegendByName(secondName), {
      shiftKey: true,
    });
    expect(getLegendByName(firstName)).toHaveClass('Mui-selected');
    expect(getLegendByName(secondName)).toHaveClass('Mui-selected');

    // Remove first legend item
    userEvent.click(getLegendByName(firstName), {
      shiftKey: true,
    });
    expect(getLegendByName(firstName)).not.toHaveClass('Mui-selected');
    expect(getLegendByName(secondName)).toHaveClass('Mui-selected');

    // Remove second legend item
    userEvent.click(getLegendByName(secondName), {
      shiftKey: true,
    });
    expect(getLegendByName(firstName)).not.toHaveClass('Mui-selected');
    expect(getLegendByName(secondName)).not.toHaveClass('Mui-selected');
  });

  it('should modify selected state when a legend item is clicked with meta key', async () => {
    renderPanel();
    const seriesArr = MOCK_TIME_SERIES_DATA_MULTIVALUE.series;

    // Falling back to a bogus string if not set to appease typescript.
    const firstName = seriesArr[0]?.name;
    const secondName = seriesArr[1]?.name;

    // Add first legend item
    userEvent.click(getLegendByName(firstName), {
      metaKey: true,
    });

    expect(getLegendByName(firstName)).toHaveClass('Mui-selected');
    expect(getLegendByName(secondName)).not.toHaveClass('Mui-selected');

    // Add second legend item
    userEvent.click(getLegendByName(secondName), {
      metaKey: true,
    });
    expect(getLegendByName(firstName)).toHaveClass('Mui-selected');
    expect(getLegendByName(secondName)).toHaveClass('Mui-selected');

    // Remove first legend item
    userEvent.click(getLegendByName(firstName), {
      metaKey: true,
    });
    expect(getLegendByName(firstName)).not.toHaveClass('Mui-selected');
    expect(getLegendByName(secondName)).toHaveClass('Mui-selected');

    // Remove second legend item
    userEvent.click(getLegendByName(secondName), {
      metaKey: true,
    });
    expect(getLegendByName(firstName)).not.toHaveClass('Mui-selected');
    expect(getLegendByName(secondName)).not.toHaveClass('Mui-selected');
  });
});
