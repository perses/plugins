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
} from '@perses-dev/plugin-system';
import { ReactElement, useCallback } from 'react';
import { produce } from 'immer';
import { ClickHouseTimeSeriesQuerySpec } from './click-house-query-types';
import { DATASOURCE_KIND, DEFAULT_DATASOURCE } from '../constants';
import { ClickQLEditor } from '../../components';
import { Stack } from '@mui/material';
import { queryExample } from '../../components/constants';
import { useQueryState } from '../query-editor-model';

type ClickHouseTimeSeriesQueryEditorProps = OptionsEditorProps<ClickHouseTimeSeriesQuerySpec>;

export function ClickHouseTimeSeriesQueryEditor(props: ClickHouseTimeSeriesQueryEditorProps): ReactElement {
  const { onChange, value, queryHandlerSettings } = props;
  const { datasource } = value;
  const selectedDatasource = datasource ?? DEFAULT_DATASOURCE;
  const { query, handleQueryChange, handleQueryBlur } = useQueryState(props);

  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (newDatasourceSelection) => {
    if (!isVariableDatasource(newDatasourceSelection) && newDatasourceSelection.kind === DATASOURCE_KIND) {
      onChange(
        produce(value, (draft) => {
          draft.datasource = newDatasourceSelection;
        })
      );

      if (queryHandlerSettings?.setWatchOtherSpecs)
        queryHandlerSettings.setWatchOtherSpecs({ ...value, datasource: newDatasourceSelection });
      return;
    }
    throw new Error('Got unexpected non ClickHouse datasource selection');
  };

  // Immediate query execution on Enter or blur
  const handleQueryExecute = (query: string) => {
    if (queryHandlerSettings?.watchQueryChanges) {
      queryHandlerSettings.watchQueryChanges(query);
    }
    onChange(
      produce(value, (draft) => {
        draft.query = query;
      })
    );
  };

  const handleClickHouseQueryChange = useCallback(
    (e: string) => {
      handleQueryChange(e);
      if (queryHandlerSettings?.watchQueryChanges) {
        queryHandlerSettings.watchQueryChanges(e);
      }
    },
    [handleQueryChange, queryHandlerSettings]
  );

  const examplesStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#777',
    backgroundColor: '#f5f5f5',
    padding: '8px',
    borderRadius: '4px',
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
    whiteSpace: 'pre-wrap',
    lineHeight: '1.3',
  };

  return (
    <Stack spacing={1.5}>
      <DatasourceSelect
        datasourcePluginKind={DATASOURCE_KIND}
        value={selectedDatasource}
        onChange={handleDatasourceChange}
        label="ClickHouse Datasource"
        notched
      />
      <ClickQLEditor
        value={query}
        onChange={handleClickHouseQueryChange}
        onBlur={queryHandlerSettings?.runWithOnBlur ? handleQueryBlur : undefined}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            handleQueryExecute(query);
          }
        }}
        placeholder="Enter ClickHouse SQL query"
      />

      <details>
        <summary style={{ cursor: 'pointer', fontSize: '12px', color: '#666', marginBottom: '8px' }}>
          Query Examples
        </summary>
        <div style={examplesStyle}>{queryExample}</div>
      </details>
    </Stack>
  );
}
