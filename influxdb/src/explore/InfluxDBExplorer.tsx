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

import { ReactElement, useState } from 'react';
import { Box, Stack, Tab, Tabs } from '@mui/material';
import { DataQueriesProvider, MultiQueryEditor, useSuggestedStepMs } from '@perses-dev/plugin-system';
import { Panel } from '@perses-dev/dashboards';
import { QueryDefinition } from '@perses-dev/core';
import { useExplorerManagerContext } from '@perses-dev/explore';
import useResizeObserver from 'use-resize-observer';

interface TimeSeriesExplorerQueryParams {
  tab?: string;
  queries?: QueryDefinition[];
}

const PANEL_PREVIEW_HEIGHT = 700;
const FILTERED_QUERY_PLUGINS = ['InfluxDBTimeSeriesQuery'];

function toDefinitions(queries: QueryDefinition[]): Array<{ kind: string; spec: Record<string, unknown> }> {
  return queries.map((q) => ({ kind: q.spec.plugin.kind, spec: q.spec.plugin.spec }));
}

function TimeSeriesPanel({ queries }: { queries: QueryDefinition[] }): ReactElement {
  const { width, ref: boxRef } = useResizeObserver();
  const suggestedStepMs = useSuggestedStepMs(width);

  return (
    <Box ref={boxRef} height={PANEL_PREVIEW_HEIGHT}>
      <DataQueriesProvider definitions={toDefinitions(queries)} options={{ suggestedStepMs, mode: 'range' }}>
        <Panel
          panelOptions={{ hideHeader: true }}
          definition={{
            kind: 'Panel',
            spec: { queries, display: { name: '' }, plugin: { kind: 'TimeSeriesChart', spec: {} } },
          }}
        />
      </DataQueriesProvider>
    </Box>
  );
}

function MetricDataTable({ queries }: { queries: QueryDefinition[] }): ReactElement {
  return (
    <Box height={PANEL_PREVIEW_HEIGHT}>
      <DataQueriesProvider definitions={toDefinitions(queries)} options={{ mode: 'instant' }}>
        <Panel
          panelOptions={{ hideHeader: true }}
          definition={{
            kind: 'Panel',
            spec: { queries, display: { name: '' }, plugin: { kind: 'TimeSeriesTable', spec: {} } },
          }}
        />
      </DataQueriesProvider>
    </Box>
  );
}

export function InfluxDBExplorer(): ReactElement {
  const {
    data: { tab = 'table', queries = [] },
    setData,
  } = useExplorerManagerContext<TimeSeriesExplorerQueryParams>();

  const [queryDefinitions, setQueryDefinitions] = useState<QueryDefinition[]>(queries);

  return (
    <Stack gap={2} sx={{ width: '100%' }}>
      <MultiQueryEditor
        queryTypes={['TimeSeriesQuery']}
        onChange={(state) => setQueryDefinitions(state)}
        queries={queryDefinitions}
        onQueryRun={() => setData({ tab, queries: queryDefinitions })}
        filteredQueryPlugins={FILTERED_QUERY_PLUGINS}
      />
      <Tabs
        value={tab}
        onChange={(_, state) => setData({ tab: state, queries: queryDefinitions })}
        variant="scrollable"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="table" label="Table" />
        <Tab value="graph" label="Graph" />
      </Tabs>
      {tab === 'table' && <MetricDataTable queries={queries} />}
      {tab === 'graph' && <TimeSeriesPanel queries={queries} />}
    </Stack>
  );
}
