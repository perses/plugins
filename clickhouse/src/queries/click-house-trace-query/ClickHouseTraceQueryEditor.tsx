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

import { MenuItem, Stack, TextField, Typography } from '@mui/material';
import { createModEnterHandler } from '@perses-dev/dashboards';
import type { DatasourceSelectProps, OptionsEditorProps } from '@perses-dev/plugin-system';
import { DatasourceSelect, isVariableDatasource } from '@perses-dev/plugin-system';
import { produce } from 'immer';
import type { ReactElement } from 'react';
import { useState } from 'react';

import { ClickQLEditor } from '../../components';
import { DATASOURCE_KIND, DEFAULT_DATASOURCE } from '../constants';
import { useQueryState } from '../query-editor-model';
import type { ClickHouseTraceQuerySpec } from './click-house-trace-query-types';
import { DEFAULT_TRACE_SEARCH_LIMIT, DEFAULT_TRACE_TABLE } from './click-house-trace-query-types';

const LIMIT_OPTIONS = [20, 50, 100, 500, 1000, 5000];

type ClickHouseTraceQueryEditorProps = OptionsEditorProps<ClickHouseTraceQuerySpec>;

export function ClickHouseTraceQueryEditor(props: ClickHouseTraceQueryEditorProps): ReactElement {
  const { onChange, value } = props;
  const selectedDatasource = value.datasource ?? DEFAULT_DATASOURCE;
  const { query, handleQueryChange, handleQueryBlur } = useQueryState(props);

  // Like the query, the table is only synced with the spec on blur, so the preview doesn't re-run on every keystroke
  const [table, setTable] = useState(value.table ?? '');
  const [lastSyncedTable, setLastSyncedTable] = useState(value.table);
  if (value.table !== lastSyncedTable) {
    setTable(value.table ?? '');
    setLastSyncedTable(value.table);
  }

  const limit = value.limit ?? DEFAULT_TRACE_SEARCH_LIMIT;
  const limitOptions = LIMIT_OPTIONS.includes(limit)
    ? LIMIT_OPTIONS
    : [...LIMIT_OPTIONS, limit].toSorted((a, b) => a - b);

  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (newDatasourceSelection) => {
    if (!isVariableDatasource(newDatasourceSelection) && newDatasourceSelection.kind === DATASOURCE_KIND) {
      onChange(
        produce(value, (draft) => {
          draft.datasource = newDatasourceSelection;
        }),
      );
      return;
    }
    throw new Error('Got unexpected non ClickHouse datasource selection');
  };

  const handleQueryExecute = (): void => {
    onChange(
      produce(value, (draft) => {
        draft.query = query;
      }),
    );
  };

  const handleTableBlur = (): void => {
    const nextTable = table.trim() === '' ? undefined : table.trim();
    setLastSyncedTable(nextTable);
    onChange(
      produce(value, (draft) => {
        draft.table = nextTable;
      }),
    );
  };

  const handleLimitChange = (nextLimit: number): void => {
    onChange(
      produce(value, (draft) => {
        draft.limit = nextLimit;
      }),
    );
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
        onChange={handleQueryChange}
        onBlur={handleQueryBlur}
        onKeyDown={createModEnterHandler(handleQueryExecute)}
        placeholder="Enter a trace ID, or a SQL query returning one row per span"
      />
      <Typography variant="caption" color="text.secondary">
        A trace ID shows that trace. A SQL query searches traces: return one row per span with the columns TraceId,
        Timestamp, Duration, ParentSpanId, SpanName, ServiceName and StatusCode. {'{start}'} and {'{end}'} are replaced
        with the dashboard time range.
      </Typography>
      <Stack direction="row" spacing={2}>
        <TextField
          label="Trace table"
          size="small"
          value={table}
          placeholder={DEFAULT_TRACE_TABLE}
          helperText="Read when looking up a trace by ID"
          onChange={(e) => setTable(e.target.value)}
          onBlur={handleTableBlur}
          sx={{ flexGrow: 1 }}
        />
        <TextField
          select
          label="Max traces"
          size="small"
          value={limit}
          onChange={(e) => handleLimitChange(Number(e.target.value))}
          sx={{ width: 120 }}
        >
          {limitOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
    </Stack>
  );
}
