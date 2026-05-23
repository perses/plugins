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

import { Stack } from '@mui/material';
import { produce } from 'immer';
import {
  DatasourceSelect,
  DatasourceSelectProps,
  isVariableDatasource,
  OptionsEditorProps,
} from '@perses-dev/plugin-system';
import { ReactElement, useCallback } from 'react';
import { GreptimeDBQLEditor } from '../../components';
import { DATASOURCE_KIND, DEFAULT_DATASOURCE } from '../constants';
import { useQueryState } from '../query-editor-model';
import { GreptimeDBTraceQuerySpec } from './greptimedb-trace-query-types';

type GreptimeDBTraceQueryEditorProps = OptionsEditorProps<GreptimeDBTraceQuerySpec>;

export function GreptimeDBTraceQueryEditor(props: GreptimeDBTraceQueryEditorProps): ReactElement {
  const { onChange, value } = props;
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
      return;
    }
    throw new Error('Got unexpected non GreptimeDB datasource selection');
  };

  const handleQueryExecute = (queryValue: string): void => {
    onChange(
      produce(value, (draft) => {
        draft.query = queryValue;
      })
    );
  };

  const handleGreptimeDBQueryChange = useCallback(
    (next: string) => {
      handleQueryChange(next);
    },
    [handleQueryChange]
  );

  return (
    <Stack spacing={1.5}>
      <DatasourceSelect
        datasourcePluginKind={DATASOURCE_KIND}
        value={selectedDatasource}
        onChange={handleDatasourceChange}
        label="GreptimeDB Datasource"
        notched
      />
      <GreptimeDBQLEditor
        value={query}
        onChange={handleGreptimeDBQueryChange}
        onBlur={handleQueryBlur}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            handleQueryExecute(query);
          }
        }}
        placeholder="Enter SQL for trace search or trace details"
      />
    </Stack>
  );
}
