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
import { Panel } from '@perses-dev/dashboards';
import { useExplorerManagerContext } from '@perses-dev/explore';
import { DataQueriesProvider, MultiQueryEditor } from '@perses-dev/plugin-system';
import { QueryDefinition } from '@perses-dev/spec';
import { ReactElement, useState } from 'react';

interface ProfilesExplorerQueryParams {
  queries?: QueryDefinition[];
}

const initialSpec = {
  palette: 'package-name',
  showSettings: true,
  showSeries: true,
  showTable: true,
  showFlameGraph: true,
  traceHeight: 25,
};

function FlameGraphPanel({ queries }: { queries: QueryDefinition[] }): ReactElement {
  return (
    <Panel
      panelOptions={{
        hideHeader: true,
      }}
      definition={{
        kind: 'Panel',
        spec: { queries, display: { name: '' }, plugin: { kind: 'FlameChart', spec: initialSpec } },
      }}
    />
  );
}

export function PyroscopeExplorer(): ReactElement {
  const {
    data: { queries = [] },
    setData,
  } = useExplorerManagerContext<ProfilesExplorerQueryParams>();

  const [queryDefinitions, setQueryDefinitions] = useState<QueryDefinition[]>(queries);

  // map ProfileQueryDefinition to Definition<UnknownSpec>
  const definitions = queries.length
    ? queries.map((query: QueryDefinition) => {
        return {
          kind: query.spec.plugin.kind,
          spec: query.spec.plugin.spec,
        };
      })
    : [];

  return (
    <Stack gap={2} sx={{ width: '100%' }}>
      <MultiQueryEditor
        queryTypes={['ProfileQuery']}
        onChange={(state) => setQueryDefinitions(state)}
        queries={queryDefinitions}
        onQueryRun={() => setData({ queries: queryDefinitions })}
      />
      <DataQueriesProvider definitions={definitions}>
        <Box height={980}>
          <FlameGraphPanel queries={queries} />
        </Box>
      </DataQueriesProvider>
    </Stack>
  );
}
