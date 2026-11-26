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

import { Box, Stack, Tab, Tabs } from '@mui/material';
import { ErrorAlert, ErrorBoundary, LoadingOverlay, NoDataOverlay, useTimeZone } from '@perses-dev/components';
import { Panel } from '@perses-dev/dashboards';
import { useExplorerManagerContext } from '@perses-dev/explore';
import {
  DataQueriesProvider,
  MultiQueryEditor,
  useDataQueries,
  useSuggestedStepMs,
  useTimeRange,
} from '@perses-dev/plugin-system';
import type { Labels, QueryDefinition, QueryPluginType } from '@perses-dev/spec';
import { isValidTraceId } from '@perses-dev/spec';
import isEqual from 'lodash/isEqual';
import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { useResizeObserver } from 'use-resize-observer';

import type { ClickHouseProfileQuerySpec } from '../queries/click-house-profile-query/click-house-profile-query-types';
import { NAME_LABEL } from '../queries/click-house-time-series-query/time-series';
import type { ClickHouseTraceQuerySpec } from '../queries/click-house-trace-query/click-house-trace-query-types';
import type { ClickHouseExplorerQueryParams } from './links';
import { linkToSpan, linkToTrace, TRACE_QUERY_KIND } from './links';

type ExplorerTab = 'graph' | 'table' | 'traces' | 'profiles';

const TABS: ReadonlyArray<{ value: ExplorerTab; label: string }> = [
  { value: 'graph', label: 'Graph' },
  { value: 'table', label: 'Table' },
  { value: 'traces', label: 'Traces' },
  { value: 'profiles', label: 'Profiles' },
];
const DEFAULT_TAB: ExplorerTab = 'graph';

const PANEL_HEIGHT = 700;
const PROFILE_PANEL_HEIGHT = 980;
const NO_QUERIES: QueryDefinition[] = [];

// The explorer only runs the queries of this plugin: the other datasources have their own explorers.
const TIME_SERIES_QUERY_TYPES: QueryPluginType[] = ['TimeSeriesQuery'];
const TIME_SERIES_QUERY_PLUGINS = ['ClickHouseTimeSeriesQuery'];
const TRACE_QUERY_TYPES: QueryPluginType[] = ['TraceQuery'];
const TRACE_QUERY_PLUGINS = [TRACE_QUERY_KIND];
const PROFILE_QUERY_TYPES: QueryPluginType[] = ['ProfileQuery'];
const PROFILE_QUERY_PLUGINS = ['ClickHouseProfileQuery'];

const PANEL_OPTIONS = { hideHeader: true };
const GRAPH_SPEC = { legend: { position: 'bottom', mode: 'list' } };
// The time of the rows is the one of the query: only their values and labels are worth a column.
const TABLE_SPEC = { density: 'compact', columnSettings: [{ name: 'timestamp', hide: true }] };
const FLAME_CHART_SPEC = {
  palette: 'package-name',
  showSettings: true,
  showSeries: true,
  showTable: true,
  showFlameGraph: true,
};

function isExplorerTab(tab: string | undefined): tab is ExplorerTab {
  return TABS.some(({ value }) => value === tab);
}

interface QueryDrafts {
  /** Queries being edited. */
  drafts: QueryDefinition[];
  setDrafts: (queries: QueryDefinition[]) => void;
  /** Runs the edited queries: saves them in the state of the explorer. */
  run: () => void;
}

/**
 * useQueryDrafts keeps the queries of a tab while they are edited, apart from the ones that ran last, which are part
 * of the state of the explorer.
 */
function useQueryDrafts(saved: QueryDefinition[], save: (queries: QueryDefinition[]) => void): QueryDrafts {
  const [drafts, setDrafts] = useState(saved);
  const { refresh } = useTimeRange();

  // When the state of the explorer changes from elsewhere, e.g. a link opening a trace, show its queries.
  const [lastSaved, setLastSaved] = useState(saved);
  if (!isEqual(saved, lastSaved)) {
    setLastSaved(saved);
    setDrafts(saved);
  }

  const run = (): void => {
    setLastSaved(drafts);
    save(drafts);
    // Queries are cached by their content: running unchanged queries again needs a refresh.
    if (isEqual(drafts, saved)) refresh();
  };

  return { drafts, setDrafts, run };
}

function GraphPanel({ queries }: { queries: QueryDefinition[] }): ReactElement {
  const { width, ref } = useResizeObserver();
  const suggestedStepMs = useSuggestedStepMs(width);

  return (
    <Box ref={ref} height={PANEL_HEIGHT}>
      {/* The step of the queries follows the width of the graph: wait for it rather than run them twice. */}
      {width === undefined ? null : (
        <DataQueriesProvider definitions={queries} options={{ suggestedStepMs, mode: 'range' }}>
          <Panel
            panelOptions={PANEL_OPTIONS}
            definition={{
              kind: 'Panel',
              spec: { queries, display: { name: '' }, plugin: { kind: 'TimeSeriesChart', spec: GRAPH_SPEC } },
            }}
          />
        </DataQueriesProvider>
      )}
    </Box>
  );
}

/**
 * getTableTransforms returns the transforms displaying the series of a query as the table the query returns. A
 * query returning several value columns gives one series per column, named by the `__name__` label: when its rows
 * are identified by a single label column, the series are pivoted back into one column per value.
 */
export function getTableTransforms(seriesLabels: Array<Labels | undefined>): Array<Record<string, unknown>> {
  const labelNames = new Set<string>();
  let hasValueNames = false;
  for (const labels of seriesLabels) {
    for (const name of Object.keys(labels ?? {})) {
      if (name === NAME_LABEL) {
        hasValueNames = true;
      } else {
        labelNames.add(name);
      }
    }
  }
  const [rowField] = labelNames;
  if (!hasValueNames || labelNames.size !== 1 || rowField === undefined) return [];
  return [{ kind: 'PivotByLabel', spec: { columnLabel: NAME_LABEL, rowField } }];
}

function ResultTable({ queries }: { queries: QueryDefinition[] }): ReactElement {
  const { queryResults } = useDataQueries('TimeSeriesQuery');
  // With several queries, the table suffixes their columns: they are left as they are.
  const series = queryResults.length === 1 ? queryResults[0]?.data?.series : undefined;
  const spec = useMemo(
    () => ({ ...TABLE_SPEC, transforms: getTableTransforms((series ?? []).map((entry) => entry.labels)) }),
    [series],
  );

  return (
    <Panel
      panelOptions={PANEL_OPTIONS}
      definition={{ kind: 'Panel', spec: { queries, display: { name: '' }, plugin: { kind: 'Table', spec } } }}
    />
  );
}

function TablePanel({ queries }: { queries: QueryDefinition[] }): ReactElement {
  return (
    <Box height={PANEL_HEIGHT}>
      <DataQueriesProvider definitions={queries} options={{ mode: 'instant' }}>
        <ResultTable queries={queries} />
      </DataQueriesProvider>
    </Box>
  );
}

function TimeSeriesExplorer({ view }: { view: 'graph' | 'table' }): ReactElement {
  const { data, setData } = useExplorerManagerContext<ClickHouseExplorerQueryParams>();
  const queries = data.queries ?? NO_QUERIES;
  const { drafts, setDrafts, run } = useQueryDrafts(queries, (next) => setData({ ...data, queries: next }));

  return (
    <Stack gap={1}>
      <MultiQueryEditor
        queryTypes={TIME_SERIES_QUERY_TYPES}
        filteredQueryPlugins={TIME_SERIES_QUERY_PLUGINS}
        queries={drafts}
        onChange={setDrafts}
        onQueryRun={run}
      />
      {view === 'table' ? <TablePanel queries={queries} /> : <GraphPanel queries={queries} />}
    </Stack>
  );
}

function TraceSearchResults({ queries }: { queries: QueryDefinition[] }): ReactElement | null {
  const { timeZone } = useTimeZone();
  const { isFetching, isPending, queryResults } = useDataQueries('TraceQuery');

  if (queryResults.length === 0) {
    return null;
  }
  if (isPending || isFetching) {
    return <LoadingOverlay />;
  }
  const failed = queryResults.find((result) => result.error);
  if (failed) {
    // Displayed by the error boundary of the explorer.
    throw failed.error;
  }
  if (!queryResults.some((result) => (result.data?.searchResult ?? []).length > 0)) {
    return <NoDataOverlay resource="traces" />;
  }

  const traceLink = linkToTrace(queries[0], timeZone);
  return (
    <Stack sx={{ height: '100%' }} gap={2}>
      <Box sx={{ height: '35%', flexShrink: 0 }}>
        <Panel
          panelOptions={PANEL_OPTIONS}
          definition={{
            kind: 'Panel',
            spec: { queries, display: { name: '' }, plugin: { kind: 'ScatterChart', spec: { link: traceLink } } },
          }}
        />
      </Box>
      <Panel
        sx={{ flexGrow: 1 }}
        panelOptions={PANEL_OPTIONS}
        definition={{
          kind: 'Panel',
          spec: {
            queries,
            display: { name: '' },
            plugin: { kind: 'TraceTable', spec: { links: { trace: traceLink } } },
          },
        }}
      />
    </Stack>
  );
}

function TracePanel({ queries, spanId }: { queries: QueryDefinition[]; spanId?: string }): ReactElement {
  const { timeZone } = useTimeZone();
  const traceId = (queries[0]?.spec.plugin.spec as Partial<ClickHouseTraceQuerySpec> | undefined)?.query;

  return (
    <Panel
      panelOptions={{ showIcons: 'always' }}
      definition={{
        kind: 'Panel',
        spec: {
          queries,
          display: { name: `Trace ${traceId}` },
          plugin: {
            kind: 'TracingGanttChart',
            spec: {
              links: { trace: linkToTrace(queries[0], timeZone), span: linkToSpan(queries[0], timeZone) },
              selectedSpanId: spanId,
            },
          },
        },
      }}
    />
  );
}

function TracesExplorer(): ReactElement {
  const { data, setData } = useExplorerManagerContext<ClickHouseExplorerQueryParams>();
  const queries = data.traceQueries ?? NO_QUERIES;
  const { drafts, setDrafts, run } = useQueryDrafts(queries, (next) =>
    // The selected span belongs to the trace that was displayed.
    setData({ ...data, traceQueries: next, spanId: undefined }),
  );
  const firstQuery = (queries[0]?.spec.plugin.spec as Partial<ClickHouseTraceQuerySpec> | undefined)?.query;
  // As for the trace query: a trace ID displays the trace, anything else is a search.
  const isSingleTrace = isValidTraceId(firstQuery?.trim() ?? '');

  return (
    <Stack gap={2}>
      <MultiQueryEditor
        queryTypes={TRACE_QUERY_TYPES}
        filteredQueryPlugins={TRACE_QUERY_PLUGINS}
        queries={drafts}
        onChange={setDrafts}
        onQueryRun={run}
      />
      <ErrorBoundary FallbackComponent={ErrorAlert} resetKeys={[queries]}>
        <DataQueriesProvider definitions={queries}>
          <Box height={PANEL_HEIGHT}>
            {isSingleTrace ? (
              <TracePanel queries={queries} spanId={data.spanId} />
            ) : (
              <TraceSearchResults queries={queries} />
            )}
          </Box>
        </DataQueriesProvider>
      </ErrorBoundary>
    </Stack>
  );
}

function ProfilesExplorer(): ReactElement {
  const { data, setData } = useExplorerManagerContext<ClickHouseExplorerQueryParams>();
  const queries = data.profileQueries ?? NO_QUERIES;
  const { drafts, setDrafts, run } = useQueryDrafts(queries, (next) => setData({ ...data, profileQueries: next }));
  // The flame chart has nothing to draw before a query is written.
  const hasQuery = queries.some((query) =>
    (query.spec.plugin.spec as Partial<ClickHouseProfileQuerySpec> | undefined)?.query?.trim(),
  );

  return (
    <Stack gap={2}>
      <MultiQueryEditor
        queryTypes={PROFILE_QUERY_TYPES}
        filteredQueryPlugins={PROFILE_QUERY_PLUGINS}
        queries={drafts}
        onChange={setDrafts}
        onQueryRun={run}
      />
      {hasQuery ? (
        <DataQueriesProvider definitions={queries}>
          <Box height={PROFILE_PANEL_HEIGHT}>
            <Panel
              panelOptions={PANEL_OPTIONS}
              definition={{
                kind: 'Panel',
                spec: { queries, display: { name: '' }, plugin: { kind: 'FlameChart', spec: FLAME_CHART_SPEC } },
              }}
            />
          </Box>
        </DataQueriesProvider>
      ) : null}
    </Stack>
  );
}

function ExplorerTabContent({ tab }: { tab: ExplorerTab }): ReactElement {
  switch (tab) {
    case 'traces':
      return <TracesExplorer />;
    case 'profiles':
      return <ProfilesExplorer />;
    default:
      // The graph and the table share their queries: switching between them keeps the editor as it is.
      return <TimeSeriesExplorer view={tab} />;
  }
}

/**
 * ClickHouseExplorer runs ad hoc ClickHouse queries: time series as a graph or a table, trace searches and traces,
 * and profiles. Logs are explored with the log explorer, which runs the log queries of every datasource.
 */
export function ClickHouseExplorer(): ReactElement {
  const { data, setData } = useExplorerManagerContext<ClickHouseExplorerQueryParams>();
  const tab = isExplorerTab(data.tab) ? data.tab : DEFAULT_TAB;

  return (
    <Stack gap={2} sx={{ width: '100%' }}>
      <Tabs
        value={tab}
        onChange={(_event, next: ExplorerTab) => setData({ ...data, tab: next })}
        variant="scrollable"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        {TABS.map(({ value, label }) => (
          <Tab key={value} value={value} label={label} />
        ))}
      </Tabs>
      <ExplorerTabContent tab={tab} />
    </Stack>
  );
}
