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

import { Stack, Box } from '@mui/material';
import { createModEnterHandler } from '@perses-dev/dashboards';
import type { DatasourceSelectProps, OptionsEditorProps } from '@perses-dev/plugin-system';
import { DatasourceSelect, isVariableDatasource } from '@perses-dev/plugin-system';
import { produce } from 'immer';
import type { ReactElement } from 'react';
import { useCallback } from 'react';

import { TrinoQLEditor, TrinoQueryContextEditor } from '../../components';
import type { TrinoQueryContext } from '../../components';
import { queryExample } from '../../components/constants';
import { DATASOURCE_KIND, DEFAULT_DATASOURCE } from '../constants';
import { useQueryState } from '../query-editor-model';
import type { TrinoLogQuerySpec } from './trino-log-query-types';

type TrinoQueryEditorProps = OptionsEditorProps<TrinoLogQuerySpec>;

export function TrinoLogQueryEditor(props: TrinoQueryEditorProps): ReactElement {
  const { onChange, value } = props;
  const { datasource } = value;
  const selectedDatasource = datasource ?? DEFAULT_DATASOURCE;
  const { query, handleQueryChange, handleQueryBlur } = useQueryState(props);

  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (newDatasourceSelection) => {
    if (!isVariableDatasource(newDatasourceSelection) && newDatasourceSelection.kind === DATASOURCE_KIND) {
      onChange(
        produce(value, (draft) => {
          draft.datasource = newDatasourceSelection;
        }),
      );
      return;
    }
    throw new Error('Got unexpected non Trino datasource selection');
  };

  const handleQueryContextChange = (context: TrinoQueryContext): void => {
    onChange(
      produce(value, (draft) => {
        draft.catalog = context.catalog;
        draft.schema = context.schema;
        draft.sessionProperties = context.sessionProperties;
        draft.source = context.source;
        draft.routingGroup = context.routingGroup;
      }),
    );
  };

  // Immediate query execution on Enter or blur
  const handleQueryExecute = (queryText: string): void => {
    onChange(
      produce(value, (draft) => {
        draft.query = queryText;
      }),
    );
  };

  const handleTrinoQueryChange = useCallback(
    (e: string) => {
      handleQueryChange(e);
    },
    [handleQueryChange],
  );

  return (
    <Stack spacing={1.5}>
      <DatasourceSelect
        datasourcePluginKind={DATASOURCE_KIND}
        value={selectedDatasource}
        onChange={handleDatasourceChange}
        label="Trino Datasource"
        notched
      />
      <TrinoQueryContextEditor value={value} onChange={handleQueryContextChange} isReadonly={props.isReadonly} />
      <TrinoQLEditor
        value={query}
        onChange={handleTrinoQueryChange}
        onBlur={handleQueryBlur}
        onKeyDown={createModEnterHandler(() => handleQueryExecute(query))}
        placeholder="Enter Trino SQL query"
      />

      <details>
        <summary style={{ cursor: 'pointer', fontSize: '12px', color: '#666', marginBottom: '8px' }}>
          Query Examples
        </summary>
        <Box sx={(theme) => ({ fontSize: '11px', color: theme.palette.text.secondary, backgroundColor: theme.palette.background.default, padding: '8px', borderRadius: '4px', fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace', whiteSpace: 'pre-wrap', lineHeight: '1.3' })}>{queryExample}</Box>
      </details>
    </Stack>
  );
}
