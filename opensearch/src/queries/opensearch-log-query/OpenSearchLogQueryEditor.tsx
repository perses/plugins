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

import {
  DatasourceSelect,
  DatasourceSelectProps,
  isVariableDatasource,
  OptionsEditorProps,
  useDatasourceSelectValueToSelector,
} from '@perses-dev/plugin-system';
import { Box, Checkbox, FormControlLabel, InputLabel, Link, Stack, TextField, Typography } from '@mui/material';
import { ReactElement } from 'react';
import { produce } from 'immer';
import { createModEnterHandler } from '@perses-dev/dashboards';
import { isDefaultOpenSearchSelector, OPENSEARCH_DATASOURCE_KIND, OpenSearchDatasourceSelector } from '../../model';
import { DATASOURCE_KIND, DEFAULT_DATASOURCE, PPL_DOCS_URL, PPL_QUERY_EXAMPLES } from '../constants';
import { useQueryState } from '../query-editor-model';
import { OpenSearchLogQuerySpec } from './opensearch-log-query-types';

type OpenSearchQueryEditorProps = OptionsEditorProps<OpenSearchLogQuerySpec>;

const examplesSx = {
  fontSize: '11px',
  color: 'text.secondary',
  backgroundColor: 'action.hover',
  padding: '8px',
  borderRadius: 1,
  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
  whiteSpace: 'pre-wrap',
  lineHeight: 1.3,
} as const;

export function OpenSearchLogQueryEditor(props: OpenSearchQueryEditorProps): ReactElement {
  const { onChange, value } = props;
  const { datasource } = value;
  const datasourceSelectValue = datasource ?? DEFAULT_DATASOURCE;
  const selectedDatasource = useDatasourceSelectValueToSelector(
    datasourceSelectValue,
    OPENSEARCH_DATASOURCE_KIND
  ) as OpenSearchDatasourceSelector;

  const { query, handleQueryChange, handleQueryBlur } = useQueryState(props);

  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (newDatasourceSelection) => {
    if (!isVariableDatasource(newDatasourceSelection) && newDatasourceSelection.kind === DATASOURCE_KIND) {
      onChange(
        produce(value, (draft) => {
          draft.datasource = isDefaultOpenSearchSelector(newDatasourceSelection) ? undefined : newDatasourceSelection;
        })
      );
      return;
    }
    throw new Error('Got unexpected non OpenSearch datasource selection');
  };

  const handleIndexChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const next = e.target.value;
    onChange(
      produce(value, (draft) => {
        draft.index = next.length > 0 ? next : undefined;
      })
    );
  };

  const handleStringFieldChange =
    (field: 'timestampField' | 'messageField') =>
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const next = e.target.value;
      onChange(
        produce(value, (draft) => {
          draft[field] = next.length > 0 ? next : undefined;
        })
      );
    };

  const handleDisableTimeFilterChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const checked = e.target.checked;
    onChange(
      produce(value, (draft) => {
        draft.disableTimeFilter = checked ? true : undefined;
      })
    );
  };

  // Commit the local query immediately (Mod+Enter), matching the loki/clickhouse editors.
  const handleQueryExecute = (): void => {
    onChange(
      produce(value, (draft) => {
        draft.query = query;
      })
    );
  };

  return (
    <Stack spacing={1.5} paddingBottom={1}>
      <div>
        <InputLabel sx={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Datasource</InputLabel>
        <DatasourceSelect
          datasourcePluginKind={DATASOURCE_KIND}
          value={selectedDatasource}
          onChange={handleDatasourceChange}
          label="OpenSearch Datasource"
          notched
        />
      </div>

      <div>
        <InputLabel sx={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Index pattern</InputLabel>
        <TextField
          fullWidth
          size="small"
          value={value.index ?? ''}
          onChange={handleIndexChange}
          placeholder="e.g. logs-*"
          helperText="Ignored when the PPL query starts with source=."
        />
      </div>

      <div>
        <InputLabel sx={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
          Timestamp field (optional)
        </InputLabel>
        <TextField
          fullWidth
          size="small"
          value={value.timestampField ?? ''}
          onChange={handleStringFieldChange('timestampField')}
          placeholder="@timestamp"
        />
      </div>

      <div>
        <InputLabel sx={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
          Message field (optional)
        </InputLabel>
        <TextField
          fullWidth
          size="small"
          value={value.messageField ?? ''}
          onChange={handleStringFieldChange('messageField')}
          placeholder="message"
        />
      </div>

      <FormControlLabel
        control={
          <Checkbox size="small" checked={value.disableTimeFilter ?? false} onChange={handleDisableTimeFilterChange} />
        }
        label="Disable automatic time filtering"
      />

      <div>
        <InputLabel sx={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>PPL Query</InputLabel>
        <TextField
          fullWidth
          multiline
          minRows={3}
          size="small"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onBlur={handleQueryBlur}
          onKeyDown={createModEnterHandler(handleQueryExecute)}
          placeholder='e.g. source=logs-* | where level="error"'
          inputProps={{ style: { fontFamily: 'monospace' } }}
        />
        <Typography variant="caption" sx={{ display: 'block', marginTop: '4px', color: 'text.secondary' }}>
          Uses OpenSearch{' '}
          <Link href={PPL_DOCS_URL} target="_blank" rel="noopener noreferrer">
            PPL
          </Link>
          . Requires the PPL plugin enabled on the OpenSearch cluster.
        </Typography>
      </div>

      <details>
        <Box
          component="summary"
          sx={{ cursor: 'pointer', fontSize: '12px', color: 'text.secondary', marginBottom: '8px' }}
        >
          Query Examples
        </Box>
        <Box sx={examplesSx}>{PPL_QUERY_EXAMPLES}</Box>
      </details>
    </Stack>
  );
}
