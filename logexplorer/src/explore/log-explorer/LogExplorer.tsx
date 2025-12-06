// Copyright 2025 The Perses Authors
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

import { Box, Stack } from '@mui/material';
import { DataQueriesProvider, MultiQueryEditor, useListPluginMetadata } from '@perses-dev/plugin-system';
import { ReactElement, useMemo, useState } from 'react';
import { QueryDefinition } from '@perses-dev/core';
import useResizeObserver from 'use-resize-observer';
import { Panel } from '@perses-dev/dashboards';

const PANEL_PREVIEW_HEIGHT = 700;

function LogsTablePanel({ queries }: { queries: QueryDefinition[] }): ReactElement {
  const { width, ref: boxRef } = useResizeObserver();
  const height = PANEL_PREVIEW_HEIGHT;

  // map QueryDefinition to Definition<UnknownSpec>
  const definitions = useMemo(
    () =>
      queries.length
        ? queries.map((query) => ({
            kind: query.spec.plugin.kind,
            spec: query.spec.plugin.spec,
          }))
        : [],
    [queries]
  );

  return (
    <Box ref={boxRef} height={height}>
      <DataQueriesProvider definitions={definitions}>
        <Panel
          panelOptions={{
            hideHeader: true,
          }}
          definition={{
            kind: 'Panel',
            spec: { queries: queries, display: { name: '' }, plugin: { kind: 'LogsTable', spec: {} } },
          }}
        />
      </DataQueriesProvider>
    </Box>
  );
}

export function LogExplorer(): ReactElement {
  const [queries, setQueries] = useState<QueryDefinition[]>([]);
  const [runningQueries, setRunningQueries] = useState<QueryDefinition[]>([]);

  // Get all datasource plugins that support LogQuery
  const { data: datasourcePlugins } = useListPluginMetadata(['Datasource']);

  const logDatasourcePlugins = useMemo(
    () =>
      datasourcePlugins
        ?.filter((plugin) => {
          // Check if plugin spec has the supportedQueryTypes property
          const pluginSpec = plugin.spec as any;
          return pluginSpec?.supportedQueryTypes?.includes('LogQuery');
        })
        .map((p) => p.kind) ?? [],
    [datasourcePlugins]
  );

  const handleQueryChange = (newQueries: QueryDefinition[]) => {
    setQueries(newQueries);
  };

  const handleQueryRun = () => {
    setRunningQueries(queries);
  };

  return (
    <Stack gap={2} sx={{ width: '100%' }}>
      <MultiQueryEditor
        queryTypes={['LogQuery']}
        filteredQueryPlugins={logDatasourcePlugins}
        queries={queries}
        onChange={handleQueryChange}
        onQueryRun={handleQueryRun}
      />
      <LogsTablePanel queries={runningQueries} />
    </Stack>
  );
}
