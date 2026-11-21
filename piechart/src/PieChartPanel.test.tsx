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

import { getConsistentSeriesNameColor } from './colors';
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
const DEFAULT_SPEC = {
  calculation: 'last-number',
} as PieChartOptions;
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

function createQueryResult(
  queryName: string | undefined,
  series: Array<{ name: string; formattedName?: string }>,
): PieChartPanelProps['queryResults'][number] {
  return {
    definition: {
      kind: 'TestQuery',
      spec: { ...(queryName === undefined ? {} : { name: queryName }), plugin: { kind: 'TestQuery', spec: {} } },
    },
    data: {
      timeRange: { start: new Date(0), end: new Date(1000) },
      stepMs: 1000,
      series: series.map(({ name, formattedName }) => ({
        name,
        formattedName: formattedName ?? name,
        values: [[1000, 42]],
        labels: {},
      })),
    },
  };
}

const SAME_NAME_QUERY_RESULTS = [
  createQueryResult('Query A', [{ name: 'requests', formattedName: 'Query A requests' }]),
  createQueryResult('Query B', [{ name: 'requests', formattedName: 'Query B requests' }]),
];
const REORDERED_SAME_NAME_QUERY_RESULTS = [
  createQueryResult('Query B', [{ name: 'requests', formattedName: 'Query B requests' }]),
  createQueryResult('Query A', [{ name: 'requests', formattedName: 'Query A requests' }]),
];
const UNEQUAL_QUERY_RESULTS = [
  createQueryResult('Query A', [{ name: 'first' }, { name: 'second' }]),
  createQueryResult('Query B', [{ name: 'third' }]),
];
const DISTINCT_NAME_QUERY_RESULTS = [
  createQueryResult('Query A', [{ name: 'requests' }]),
  createQueryResult('Query B', [{ name: 'errors' }]),
];
const EXPLICIT_PALETTE_QUERY_RESULTS = [
  createQueryResult('Query A', [{ name: 'first' }, { name: 'second' }]),
  createQueryResult('Query B', [{ name: 'third' }]),
];
const EXPLICIT_PALETTE_SPEC = {
  ...DEFAULT_SPEC,
  visual: { outerRadius: 100, colorPalette: ['#123456', '#abcdef', '#fedcba'] },
};
const ERROR_CLASSIFICATION_QUERY_RESULTS = [
  createQueryResult('Errors', [{ name: 'requests' }]),
  createQueryResult('Traffic', [{ name: 'requests' }]),
  createQueryResult('Query A', [{ name: 'request_errors' }]),
  createQueryResult('Query B', [{ name: 'request_errors' }]),
];
const UNNAMED_QUERY_RESULTS = [
  createQueryResult(undefined, [{ name: 'requests', formattedName: 'First requests' }]),
  createQueryResult(undefined, [{ name: 'requests', formattedName: 'Second requests' }]),
];
const DUPLICATE_QUERY_NAME_RESULTS = [
  createQueryResult('Metrics', [{ name: 'requests', formattedName: 'First requests' }]),
  createQueryResult('Metrics', [{ name: 'requests', formattedName: 'Second requests' }]),
];
const QUERY_RESULTS_WITH_EMPTY_MIDDLE = [
  createQueryResult('Query A', [{ name: 'first' }]),
  createQueryResult('Query B', []),
  createQueryResult('Query C', [{ name: 'second' }]),
];

function getRenderedColors(): string[] {
  const props = pieChartBaseSpy.mock.lastCall?.[0] as PieChartBaseProps | undefined;
  return props?.data?.map((series) => series.itemStyle?.color ?? '') ?? [];
}

function getRenderedColorsByName(): Record<string, string> {
  const props = pieChartBaseSpy.mock.lastCall?.[0] as PieChartBaseProps | undefined;
  return Object.fromEntries(props?.data?.map((series) => [series.name, series.itemStyle?.color ?? '']) ?? []);
}

function getHue(color: string): number {
  const hue = /^hsla\(([\d.]+),/.exec(color)?.[1];
  if (hue === undefined) throw new Error(`Expected an hsla color, received: ${color}`);
  return Number(hue);
}

describe('PieChartPanel', () => {
  beforeEach(() => {
    pieChartBaseSpy.mockClear();
  });

  it('renders legacy visual settings', () => {
    render(
      <ChartsProvider chartsTheme={testChartsTheme}>
        <PieChartPanel contentDimensions={CONTENT_DIMENSIONS} queryResults={LEGACY_QUERY_RESULTS} spec={LEGACY_SPEC} />
      </ChartsProvider>,
    );

    expect(pieChartBaseSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ itemStyle: { color: '#3366cc' } })],
        outerRadius: 100,
        showLabels: true,
      }),
    );
  });

  it('assigns different automatic colors to same-named series from different queries', () => {
    const { rerender } = render(
      <ChartsProvider chartsTheme={testChartsTheme}>
        <PieChartPanel
          contentDimensions={CONTENT_DIMENSIONS}
          queryResults={SAME_NAME_QUERY_RESULTS}
          spec={DEFAULT_SPEC}
        />
      </ChartsProvider>,
    );
    const initialColors = getRenderedColors();

    expect(initialColors[0]).not.toBe(initialColors[1]);

    rerender(
      <ChartsProvider chartsTheme={testChartsTheme}>
        <PieChartPanel
          contentDimensions={CONTENT_DIMENSIONS}
          queryResults={SAME_NAME_QUERY_RESULTS}
          spec={DEFAULT_SPEC}
        />
      </ChartsProvider>,
    );
    expect(getRenderedColors()).toEqual(initialColors);
  });

  it('keeps automatic colors associated with uniquely named queries when query order changes', () => {
    const { rerender } = render(
      <ChartsProvider chartsTheme={testChartsTheme}>
        <PieChartPanel
          contentDimensions={CONTENT_DIMENSIONS}
          queryResults={SAME_NAME_QUERY_RESULTS}
          spec={DEFAULT_SPEC}
        />
      </ChartsProvider>,
    );
    const initialColorsByName = getRenderedColorsByName();

    rerender(
      <ChartsProvider chartsTheme={testChartsTheme}>
        <PieChartPanel
          contentDimensions={CONTENT_DIMENSIONS}
          queryResults={REORDERED_SAME_NAME_QUERY_RESULTS}
          spec={DEFAULT_SPEC}
        />
      </ChartsProvider>,
    );

    expect(getRenderedColorsByName()).toEqual(initialColorsByName);
  });

  it.each([
    ['unnamed', UNNAMED_QUERY_RESULTS],
    ['duplicate-named', DUPLICATE_QUERY_NAME_RESULTS],
  ])('assigns deterministic colors to %s queries in a fixed order', (_description, queryResults) => {
    const { rerender } = render(
      <ChartsProvider chartsTheme={testChartsTheme}>
        <PieChartPanel contentDimensions={CONTENT_DIMENSIONS} queryResults={queryResults} spec={DEFAULT_SPEC} />
      </ChartsProvider>,
    );
    const initialColors = getRenderedColors();

    expect(initialColors[0]).not.toBe(initialColors[1]);

    rerender(
      <ChartsProvider chartsTheme={testChartsTheme}>
        <PieChartPanel contentDimensions={CONTENT_DIMENSIONS} queryResults={queryResults} spec={DEFAULT_SPEC} />
      </ChartsProvider>,
    );
    expect(getRenderedColors()).toEqual(initialColors);
  });

  it('assigns colors by the flattened series index when queries have unequal series counts', () => {
    render(
      <ChartsProvider chartsTheme={testChartsTheme}>
        <PieChartPanel
          contentDimensions={CONTENT_DIMENSIONS}
          queryResults={UNEQUAL_QUERY_RESULTS}
          spec={DEFAULT_SPEC}
        />
      </ChartsProvider>,
    );

    expect(getRenderedColors()).toEqual(
      ['first', 'second', 'third'].map((seriesName) => getConsistentSeriesNameColor(seriesName)),
    );
  });

  it('keeps flattened color alignment when an empty query separates populated queries', () => {
    render(
      <ChartsProvider chartsTheme={testChartsTheme}>
        <PieChartPanel
          contentDimensions={CONTENT_DIMENSIONS}
          queryResults={QUERY_RESULTS_WITH_EMPTY_MIDDLE}
          spec={DEFAULT_SPEC}
        />
      </ChartsProvider>,
    );

    expect(getRenderedColors()).toEqual(
      ['first', 'second'].map((seriesName) => getConsistentSeriesNameColor(seriesName)),
    );
  });

  it('retains the existing automatic colors for distinct series names', () => {
    render(
      <ChartsProvider chartsTheme={testChartsTheme}>
        <PieChartPanel
          contentDimensions={CONTENT_DIMENSIONS}
          queryResults={DISTINCT_NAME_QUERY_RESULTS}
          spec={DEFAULT_SPEC}
        />
      </ChartsProvider>,
    );

    expect(getRenderedColors()).toEqual(
      ['requests', 'errors'].map((seriesName) => getConsistentSeriesNameColor(seriesName)),
    );
  });

  it('retains explicitly configured palette colors', () => {
    render(
      <ChartsProvider chartsTheme={testChartsTheme}>
        <PieChartPanel
          contentDimensions={CONTENT_DIMENSIONS}
          queryResults={EXPLICIT_PALETTE_QUERY_RESULTS}
          spec={EXPLICIT_PALETTE_SPEC}
        />
      </ChartsProvider>,
    );

    expect(getRenderedColors()).toEqual(['#123456', '#abcdef', '#fedcba']);
  });

  it('uses the series name, not the query name, to classify error colors', () => {
    render(
      <ChartsProvider chartsTheme={testChartsTheme}>
        <PieChartPanel
          contentDimensions={CONTENT_DIMENSIONS}
          queryResults={ERROR_CLASSIFICATION_QUERY_RESULTS}
          spec={DEFAULT_SPEC}
        />
      </ChartsProvider>,
    );

    const [requestsInErrorsQuery, requestsInTrafficQuery, errorsInQueryA, errorsInQueryB] = getRenderedColors();
    expect(requestsInErrorsQuery).not.toBe(requestsInTrafficQuery);
    expect(getHue(requestsInErrorsQuery ?? '')).toBeGreaterThanOrEqual(20);
    expect(getHue(requestsInTrafficQuery ?? '')).toBeGreaterThanOrEqual(20);
    expect(errorsInQueryA).not.toBe(errorsInQueryB);
    expect(getHue(errorsInQueryA ?? '')).toBeLessThanOrEqual(20);
    expect(getHue(errorsInQueryB ?? '')).toBeLessThanOrEqual(20);
  });
});
