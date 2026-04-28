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
import { Alert, InputLabel, Stack, TextField } from '@mui/material';
import { ReactElement } from 'react';
import { produce } from 'immer';
import { isDefaultOpenSearchSelector, OPENSEARCH_DATASOURCE_KIND, OpenSearchDatasourceSelector } from '../../model';
import { DATASOURCE_KIND, DEFAULT_DATASOURCE } from '../constants';
import { useQueryState } from '../query-editor-model';
import { OpenSearchLogQuerySpec } from './opensearch-log-query-types';

type OpenSearchQueryEditorProps = OptionsEditorProps<OpenSearchLogQuerySpec> & {
  queryError?: { message: string; body?: string };
};

function tryParseReason(body?: string): string | undefined {
  if (!body) return undefined;
  try {
    const parsed = JSON.parse(body);
    return parsed?.error?.reason ?? parsed?.error?.details ?? undefined;
  } catch {
    return undefined;
  }
}

export function OpenSearchLogQueryEditor(props: OpenSearchQueryEditorProps): ReactElement {
  const { onChange, value, queryError } = props;
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

  return (
    <Stack spacing={1.5} paddingBottom={1}>
      {queryError ? (
        <Alert severity="error" data-testid="opensearch-query-error">
          {tryParseReason(queryError.body) ?? queryError.message}
        </Alert>
      ) : null}
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
          placeholder='e.g. source=logs-* | where level="error"'
          inputProps={{ style: { fontFamily: 'monospace' } }}
        />
      </div>
    </Stack>
  );
}
