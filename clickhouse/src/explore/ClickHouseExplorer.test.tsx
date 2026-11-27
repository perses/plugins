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

import type * as PluginSystemModule from '@perses-dev/plugin-system';
import type { QueryDefinition } from '@perses-dev/spec';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

import { ClickHouseExplorer, getTableTransforms } from './ClickHouseExplorer';
import type { ClickHouseExplorerQueryParams } from './links';
import { linkToSpan, linkToTrace } from './links';

const mocks = vi.hoisted(() => ({
  data: {} as ClickHouseExplorerQueryParams,
  setData: vi.fn(),
  refresh: vi.fn(),
  panels: [] as string[],
  editors: [] as Array<{ queryTypes: string[]; queries: QueryDefinition[] }>,
}));

vi.mock('@perses-dev/explore', () => ({
  useExplorerManagerContext: (): unknown => ({ data: mocks.data, setData: mocks.setData }),
}));

vi.mock('@perses-dev/dashboards', () => ({
  Panel: ({ definition }: { definition: { spec: { plugin: { kind: string } } } }): null => {
    mocks.panels.push(definition.spec.plugin.kind);
    return null;
  },
}));

vi.mock('use-resize-observer', () => ({
  useResizeObserver: (): unknown => ({ width: 1000, ref: vi.fn() }),
}));

vi.mock('@perses-dev/plugin-system', async (importOriginal) => {
  const actual = await importOriginal<typeof PluginSystemModule>();
  return {
    ...actual,
    useTimeRange: (): unknown => ({ refresh: mocks.refresh }),
    useSuggestedStepMs: (): number => 15_000,
    useDataQueries: (): unknown => ({ queryResults: [], isFetching: false, isPending: false }),
    DataQueriesProvider: ({ children }: { children: ReactNode }): ReactNode => children,
    MultiQueryEditor: ({
      queryTypes,
      queries,
      onChange,
      onQueryRun,
    }: {
      queryTypes: string[];
      queries: QueryDefinition[];
      onChange: (queries: QueryDefinition[]) => void;
      onQueryRun: () => void;
    }): ReactElement => {
      mocks.editors.push({ queryTypes, queries });
      return (
        <>
          <button onClick={() => onChange([traceQuery('SELECT TraceId, Timestamp FROM otel_traces')])}>Edit</button>
          <button onClick={onQueryRun}>Run Query</button>
        </>
      );
    },
  };
});

function traceQuery(query: string, spec: Record<string, unknown> = {}): QueryDefinition {
  return { kind: 'TraceQuery', spec: { plugin: { kind: 'ClickHouseTraceQuery', spec: { ...spec, query } } } };
}

function profileQuery(query: string): QueryDefinition {
  return { kind: 'ProfileQuery', spec: { plugin: { kind: 'ClickHouseProfileQuery', spec: { query } } } };
}

const TIME_SERIES_QUERY: QueryDefinition = {
  kind: 'TimeSeriesQuery',
  spec: { plugin: { kind: 'ClickHouseTimeSeriesQuery', spec: { query: 'SELECT 1 AS value' } } },
};

function parseLink(link: string): { explorer: string | null; data: unknown; tz: string | null } {
  const params = new URLSearchParams(link.split('?')[1]);
  return { explorer: params.get('explorer'), data: JSON.parse(params.get('data') ?? 'null'), tz: params.get('tz') };
}

describe('ClickHouseExplorer', () => {
  beforeEach(() => {
    mocks.setData.mockClear();
    mocks.refresh.mockClear();
    mocks.panels = [];
    mocks.editors = [];
  });

  it('graphs the time series queries by default, and lists them in the table tab', () => {
    mocks.data = { queries: [TIME_SERIES_QUERY] };
    const { unmount } = render(<ClickHouseExplorer />);
    expect(mocks.panels).toEqual(['TimeSeriesChart']);
    expect(mocks.editors.at(-1)).toEqual({ queryTypes: ['TimeSeriesQuery'], queries: [TIME_SERIES_QUERY] });
    unmount();

    mocks.panels = [];
    mocks.data = { tab: 'table', queries: [TIME_SERIES_QUERY] };
    render(<ClickHouseExplorer />);
    expect(mocks.panels).toEqual(['Table']);
  });

  it('keeps the queries of the other tabs when it switches tab or runs queries', () => {
    mocks.data = { tab: 'traces', queries: [TIME_SERIES_QUERY], traceQueries: [traceQuery('SELECT 1')], spanId: 'a' };
    render(<ClickHouseExplorer />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run Query' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Profiles' }));

    expect(mocks.setData).toHaveBeenNthCalledWith(1, {
      tab: 'traces',
      queries: [TIME_SERIES_QUERY],
      traceQueries: [traceQuery('SELECT TraceId, Timestamp FROM otel_traces')],
      // The selected span was the one of the previous trace.
      spanId: undefined,
    });
    expect(mocks.setData).toHaveBeenNthCalledWith(2, { ...mocks.data, tab: 'profiles' });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it('refreshes the queries when they are run again unchanged', () => {
    // A structurally equal copy, as when the state of the explorer is read back from the URL.
    mocks.data = { tab: 'traces', traceQueries: [traceQuery('SELECT 1')] };
    render(<ClickHouseExplorer />);

    fireEvent.click(screen.getByRole('button', { name: 'Run Query' }));

    expect(mocks.setData).toHaveBeenCalledWith({ tab: 'traces', traceQueries: [traceQuery('SELECT 1')] });
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it('displays the trace when the query is a trace ID, and shows the queries of a followed link', () => {
    mocks.data = { tab: 'traces', traceQueries: [traceQuery('SELECT 1')] };
    const { rerender } = render(<ClickHouseExplorer />);
    expect(mocks.panels).toEqual([]);

    // A link to a trace replaces the state of the explorer.
    mocks.data = { tab: 'traces', traceQueries: [traceQuery('5b8efff798038103d269b633813fc60c')], spanId: 'abc' };
    rerender(<ClickHouseExplorer />);

    expect(mocks.panels).toEqual(['TracingGanttChart']);
    expect(mocks.editors.at(-1)?.queries).toEqual([traceQuery('5b8efff798038103d269b633813fc60c')]);
  });

  it('draws the profile once a query is written', () => {
    mocks.data = { tab: 'profiles', profileQueries: [profileQuery('')] };
    const { rerender } = render(<ClickHouseExplorer />);
    expect(mocks.panels).toEqual([]);

    mocks.data = { tab: 'profiles', profileQueries: [profileQuery('SELECT FunctionNames AS stack FROM p')] };
    rerender(<ClickHouseExplorer />);
    expect(mocks.panels).toEqual(['FlameChart']);
  });
});

describe('getTableTransforms', () => {
  it('pivots the value columns of a query whose rows have a single label column', () => {
    expect(
      getTableTransforms([
        { __name__: 'spans', service: 'api' },
        { __name__: 'errors', service: 'api' },
      ]),
    ).toEqual([{ kind: 'PivotByLabel', spec: { columnLabel: '__name__', rowField: 'service' } }]);
  });

  it('leaves the other results as they are', () => {
    // A single value column.
    expect(getTableTransforms([{ service: 'api' }, { service: 'web' }])).toEqual([]);
    // Rows identified by several columns can not be pivoted.
    expect(getTableTransforms([{ __name__: 'spans', service: 'api', kind: 'Server' }])).toEqual([]);
    expect(getTableTransforms([{ __name__: 'spans' }, undefined])).toEqual([]);
  });
});

describe('trace links', () => {
  const searchQuery = traceQuery('SELECT TraceId, Timestamp FROM otel_traces', {
    datasource: { kind: 'ClickHouseDatasource', name: 'traces' },
    table: 'otel.otel_traces',
    limit: 50,
  });

  it('opens a trace in the explorer, where the search found it', () => {
    const link = linkToTrace(searchQuery, 'America/New_York');

    expect(parseLink(link)).toEqual({
      explorer: 'ClickHouse-ClickHouseExplorer',
      data: {
        tab: 'traces',
        traceQueries: [
          traceQuery('${traceId}', {
            datasource: { kind: 'ClickHouseDatasource', name: 'traces' },
            table: 'otel.otel_traces',
          }),
        ],
      },
      tz: 'America/New_York',
    });
    // The panels replace the variables of the link: they are not encoded.
    expect(link).toContain('${traceId}');
    expect(link).not.toContain('%24%7B');
  });

  it('opens a span of a trace, with the default datasource and table', () => {
    const link = linkToSpan(traceQuery('abcd'), 'local');

    expect(parseLink(link).data).toEqual({
      tab: 'traces',
      traceQueries: [traceQuery('${traceId}')],
      spanId: '${spanId}',
    });
    expect(link).toContain('${spanId}');
  });
});
