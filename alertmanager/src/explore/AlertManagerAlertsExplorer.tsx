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
import type { QueryDefinition } from '@perses-dev/spec';
import type { ReactElement } from 'react';
import { useState } from 'react';

interface AlertsExplorerQueryParams {
  queries?: QueryDefinition[];
}

const PANEL_PREVIEW_HEIGHT = 600;

export function AlertManagerAlertsExplorer(): ReactElement {
  const {
    data: { queries = [] },
    setData,
  } = useExplorerManagerContext<AlertsExplorerQueryParams>();

  const [queryDefinitions, setQueryDefinitions] = useState<QueryDefinition[]>(queries);

  return (
    <Stack gap={2} sx={{ width: '100%' }}>
      <MultiQueryEditor
        queryTypes={['AlertsQuery']}
        onChange={(state) => setQueryDefinitions(state)}
        queries={queryDefinitions}
        onQueryRun={() => setData({ queries: queryDefinitions })}
      />
      <DataQueriesProvider definitions={queries}>
        <Box height={PANEL_PREVIEW_HEIGHT}>
          <Panel
            panelOptions={{ hideHeader: true }}
            definition={{
              kind: 'Panel',
              spec: {
                queries,
                display: { name: '' },
                plugin: { kind: 'AlertTable', spec: { defaultGroupBy: ['alertname'] } },
              },
            }}
          />
        </Box>
      </DataQueriesProvider>
    </Stack>
  );
}
