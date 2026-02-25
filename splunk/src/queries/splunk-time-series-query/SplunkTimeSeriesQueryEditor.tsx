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

import {
  DatasourceSelect,
  DatasourceSelectProps,
  isVariableDatasource,
  OptionsEditorProps,
  useDatasourceSelectValueToSelector,
} from '@perses-dev/plugin-system';
import { Box, InputLabel, Stack, TextField } from '@mui/material';
import { ReactElement } from 'react';
import { produce } from 'immer';
import { SplunkTimeSeriesQuerySpec } from './splunk-time-series-query-types';

const DATASOURCE_KIND = 'SplunkDatasource';
const DEFAULT_DATASOURCE = { kind: DATASOURCE_KIND };

type SplunkQueryEditorProps = OptionsEditorProps<SplunkTimeSeriesQuerySpec>;

export function SplunkTimeSeriesQueryEditor(props: SplunkQueryEditorProps): ReactElement {
  const { onChange, value } = props;
  const { datasource, query } = value;
  const datasourceSelectValue = datasource ?? DEFAULT_DATASOURCE;
  const selectedDatasource = useDatasourceSelectValueToSelector(datasourceSelectValue, DATASOURCE_KIND);

  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (newDatasourceSelection) => {
    if (!isVariableDatasource(newDatasourceSelection) && newDatasourceSelection.kind === DATASOURCE_KIND) {
      onChange(
        produce(value, (draft) => {
          draft.datasource = newDatasourceSelection;
        })
      );
      return;
    }

    throw new Error('Got unexpected non SplunkQuery datasource selection');
  };

  const handleQueryChange = (newQuery: string) => {
    onChange(
      produce(value, (draft) => {
        draft.query = newQuery;
      })
    );
  };

  return (
    <Stack spacing={1.5} paddingBottom={1}>
      <Box>
        <InputLabel
          sx={{
            display: 'block',
            marginBottom: '4px',
            fontWeight: 500,
          }}
        >
          Datasource
        </InputLabel>
        <DatasourceSelect
          datasourcePluginKind={DATASOURCE_KIND}
          value={selectedDatasource}
          onChange={handleDatasourceChange}
          label="Splunk Datasource"
          notched
        />
      </Box>

      <Box>
        <InputLabel
          sx={{
            display: 'block',
            marginBottom: '4px',
            fontWeight: 500,
          }}
        >
          SPL Query
        </InputLabel>
        <TextField
          fullWidth
          multiline
          rows={4}
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="search index=main | timechart count"
        />
      </Box>
    </Stack>
  );
}
