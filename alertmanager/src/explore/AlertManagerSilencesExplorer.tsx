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

import { ReactElement, useCallback, useMemo, useRef, useState } from 'react';
import { Box, Button, Stack } from '@mui/material';
import BellOffIcon from 'mdi-material-ui/BellOff';
import { DataQueriesProvider, MultiQueryEditor, useDatasourceClient } from '@perses-dev/plugin-system';
import { Panel } from '@perses-dev/dashboards';
import { useExplorerManagerContext } from '@perses-dev/explore';
import { DatasourceSelector, QueryDefinition } from '@perses-dev/core';
import { useSnackbar } from '@perses-dev/components';
import { useQueryClient } from '@tanstack/react-query';
import { SilenceForm } from '../components/SilenceForm';
import { AlertManagerClient, DEFAULT_ALERTMANAGER, PostableSilence } from '../model';

interface SilencesExplorerQueryParams {
  queries?: QueryDefinition[];
}

const PANEL_PREVIEW_HEIGHT = 600;

function extractSelectorFromQueries(queries: QueryDefinition[]): DatasourceSelector {
  const spec: unknown = queries[0]?.spec?.plugin?.spec;
  if (spec && typeof spec === 'object' && 'datasource' in spec) {
    const ds = (spec as Record<string, unknown>).datasource;
    if (ds && typeof ds === 'object' && 'kind' in ds) {
      return ds as DatasourceSelector;
    }
  }
  return DEFAULT_ALERTMANAGER;
}

function CreateSilenceButton({ queries }: { queries: QueryDefinition[] }): ReactElement {
  const datasourceSelector = useMemo(() => extractSelectorFromQueries(queries), [queries]);
  const { data: amClient } = useDatasourceClient<AlertManagerClient>(datasourceSelector);
  const queryClient = useQueryClient();
  const { successSnackbar, exceptionSnackbar } = useSnackbar();

  const [open, setOpen] = useState(false);
  const formKeyRef = useRef(0);

  const handleOpen = useCallback(() => {
    formKeyRef.current++;
    setOpen(true);
  }, []);

  const handleSubmit = useCallback(
    async (silence: PostableSilence) => {
      if (!amClient) return;
      try {
        await amClient.createSilence(silence);
        setOpen(false);
        successSnackbar('Silence created successfully');
        queryClient.invalidateQueries({ queryKey: ['query', 'SilencesQuery'] });
      } catch (err) {
        exceptionSnackbar(err);
      }
    },
    [amClient, queryClient, successSnackbar, exceptionSnackbar]
  );

  return (
    <>
      <Button variant="contained" startIcon={<BellOffIcon />} onClick={handleOpen} size="small">
        Create Silence
      </Button>
      <SilenceForm key={formKeyRef.current} open={open} onClose={() => setOpen(false)} onSubmit={handleSubmit} />
    </>
  );
}

export function AlertManagerSilencesExplorer(): ReactElement {
  const {
    data: { queries = [] },
    setData,
  } = useExplorerManagerContext<SilencesExplorerQueryParams>();

  const [queryDefinitions, setQueryDefinitions] = useState<QueryDefinition[]>(queries);

  const definitions = queries.length
    ? queries.map((query: QueryDefinition) => ({
        kind: query.spec.plugin.kind,
        spec: query.spec.plugin.spec,
      }))
    : [];

  return (
    <Stack gap={2} sx={{ width: '100%' }}>
      <Stack direction="row" justifyContent="flex-end">
        <CreateSilenceButton queries={queries} />
      </Stack>
      <MultiQueryEditor
        queryTypes={['SilencesQuery']}
        onChange={(state) => setQueryDefinitions(state)}
        queries={queryDefinitions}
        onQueryRun={() => setData({ queries: queryDefinitions })}
      />
      <DataQueriesProvider definitions={definitions}>
        <Box height={PANEL_PREVIEW_HEIGHT}>
          <Panel
            panelOptions={{ hideHeader: true }}
            definition={{
              kind: 'Panel',
              spec: {
                queries,
                display: { name: '' },
                plugin: { kind: 'SilenceTable', spec: {} },
              },
            }}
          />
        </Box>
      </DataQueriesProvider>
    </Stack>
  );
}
