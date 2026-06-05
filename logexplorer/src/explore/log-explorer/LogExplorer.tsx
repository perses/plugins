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

import { Box, Stack } from '@mui/material';
import {
  DataQueriesProvider,
  LogQueryContext,
  MultiQueryEditor,
  useAllVariableValues,
  useDatasourceStore,
  useListPluginMetadata,
  usePluginRegistry,
  useTimeRange,
} from '@perses-dev/plugin-system';
import { ReactElement, useMemo, useState } from 'react';
import { QueryDefinition } from '@perses-dev/spec';
import { Panel } from '@perses-dev/dashboards';
import { useExplorerManagerContext } from '@perses-dev/explore';
import { useQuery } from '@tanstack/react-query';

interface LogExplorerQueryParams {
  queries?: QueryDefinition[];
}

const PANEL_PREVIEW_HEIGHT = 700;
const HISTOGRAM_HEIGHT = 200;
const EMPTY_QUERIES: QueryDefinition[] = [];

function LogsTablePanel({ queries }: { queries: QueryDefinition[] }): ReactElement {
  const height = PANEL_PREVIEW_HEIGHT;

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
    <Box height={height}>
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

function VolumeHistogramPanel({ queries }: { queries: QueryDefinition[] }): ReactElement {
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
    <Box height={HISTOGRAM_HEIGHT}>
      <DataQueriesProvider definitions={definitions}>
        <Panel
          panelOptions={{
            hideHeader: true,
          }}
          definition={{
            kind: 'Panel',
            spec: {
              queries: queries,
              display: { name: 'Log Volume' },
              plugin: {
                kind: 'TimeSeriesChart',
                spec: {
                  legend: {
                    position: 'bottom',
                    mode: 'list',
                  },
                  visual: {
                    display: 'bar',
                    stack: 'all',
                  },
                  yAxis: {
                    label: 'Logs per second',
                  },
                },
              },
            },
          }}
        />
      </DataQueriesProvider>
    </Box>
  );
}

export function LogExplorer(): ReactElement {
  const {
    data: { queries = EMPTY_QUERIES },
    setData,
  } = useExplorerManagerContext<LogExplorerQueryParams>();

  const [queryDefinitions, setQueryDefinitions] = useState<QueryDefinition[]>(queries);

  const { getPlugin } = usePluginRegistry();
  const { absoluteTimeRange } = useTimeRange();
  const datasourceStore = useDatasourceStore();
  const variableState = useAllVariableValues();

  const logQueryContext: LogQueryContext = useMemo(
    () => ({
      timeRange: absoluteTimeRange,
      variableState,
      datasourceStore,
      refreshKey: '',
    }),
    [absoluteTimeRange, variableState, datasourceStore]
  );

  // Get all datasource plugins that support LogQuery
  const { data: datasourcePlugins } = useListPluginMetadata(['Datasource']);

  const logDatasourcePlugins = useMemo(
    () =>
      datasourcePlugins
        ?.filter((plugin) => {
          const pluginSpec = plugin.spec as { supportedQueryTypes?: string[] };
          return pluginSpec?.supportedQueryTypes?.includes('LogQuery');
        })
        .map((p) => p.kind) ?? [],
    [datasourcePlugins]
  );

  const { data: volumeQueries = EMPTY_QUERIES } = useQuery({
    queryKey: ['logexplorer-volume-queries', queries, logQueryContext],
    queryFn: async (): Promise<QueryDefinition[]> => {
      const results = await Promise.all(
        queries.map(async (query) => {
          if (query.kind !== 'LogQuery') return null;
          try {
            const plugin = await getPlugin({ kind: 'LogQuery', name: query.spec.plugin.kind });
            return plugin?.createVolumeQuery?.(query.spec.plugin.spec, logQueryContext) ?? null;
          } catch (error) {
            console.error(`[LogExplorer] Failed to create volume query for ${query.spec.plugin.kind}:`, error);
            return null;
          }
        })
      );
      return results.filter((q): q is QueryDefinition => q !== null);
    },
  });

  return (
    <Stack gap={2} sx={{ width: '100%' }}>
      <MultiQueryEditor
        queryTypes={['LogQuery']}
        filteredQueryPlugins={logDatasourcePlugins}
        queries={queryDefinitions}
        onChange={(state) => setQueryDefinitions(state)}
        onQueryRun={() => setData({ queries: queryDefinitions })}
      />
      {volumeQueries.length > 0 && <VolumeHistogramPanel queries={volumeQueries} />}
      <LogsTablePanel queries={queries} />
    </Stack>
  );
}
