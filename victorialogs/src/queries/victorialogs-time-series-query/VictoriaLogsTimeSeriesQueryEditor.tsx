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
import { InputLabel, Stack } from '@mui/material';
import { ReactElement, useCallback, useState, useEffect } from 'react';
import { LogsQLEditor } from '../../components/logsql-editor';
import { VICTORIALOGS_DATASOURCE_KIND, VictoriaLogsDatasourceSelector } from '../../model';
import { DATASOURCE_KIND, DEFAULT_DATASOURCE } from '../constants';
import { VictoriaLogsTimeSeriesQuerySpec } from './types';

type VictoriaLogsQueryEditorProps = OptionsEditorProps<VictoriaLogsTimeSeriesQuerySpec>;

export function VictoriaLogsQueryEditor(props: VictoriaLogsQueryEditorProps): ReactElement {
  const { onChange, value } = props;
  const { datasource } = value;
  const datasourceSelectValue = datasource ?? DEFAULT_DATASOURCE;
  const selectedDatasource = useDatasourceSelectValueToSelector(
    datasourceSelectValue,
    VICTORIALOGS_DATASOURCE_KIND
  ) as VictoriaLogsDatasourceSelector;

  // Local state for editor value to prevent query_range calls on every keystroke
  const [localQuery, setLocalQuery] = useState(value.query);

  // Update local state when prop changes
  useEffect(() => {
    setLocalQuery(value.query);
  }, [value.query]);

  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (newDatasourceSelection) => {
    if (!isVariableDatasource(newDatasourceSelection) && newDatasourceSelection.kind === DATASOURCE_KIND) {
      onChange({ ...value, datasource: newDatasourceSelection });
      return;
    }

    throw new Error('Got unexpected non VictoriaLogsQuery datasource selection');
  };

  // Debounced query change handler to prevent excessive query_range calls
  const handleQueryChange = useCallback((newQuery: string) => {
    setLocalQuery(newQuery);
  }, []);

  // Immediate query execution on Enter or blur
  const handleQueryExecute = useCallback(
    (query: string) => {
      onChange({ ...value, query });
    },
    [onChange, value]
  );

  return (
    <Stack spacing={1.5} paddingBottom={1}>
      <div>
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
          label="VictoriaLogs Datasource"
          notched
        />
      </div>

      <div>
        <InputLabel
          sx={{
            display: 'block',
            marginBottom: '4px',
            fontWeight: 500,
          }}
        >
          LogsQL Query
        </InputLabel>
        <LogsQLEditor
          value={localQuery}
          onChange={handleQueryChange}
          onBlur={() => handleQueryExecute(localQuery)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              handleQueryExecute(localQuery);
            }
          }}
          placeholder='Enter LogsQL query (e.g. {job="mysql"} |= "error")'
          // height="120px"
        />
      </div>
    </Stack>
  );
}
