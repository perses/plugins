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

import { Stack, TextField } from '@mui/material';
import { OptionsEditorProps, DatasourceSelect } from '@perses-dev/plugin-system';
import { DatasourceSelector } from '@perses-dev/core';
import { SQLTimeSeriesQuerySpec } from './sql-time-series-query-types';

export function SQLTimeSeriesQueryEditor({ value, onChange }: OptionsEditorProps<SQLTimeSeriesQuerySpec>) {
  const handleDatasourceChange = (newDatasource: DatasourceSelector | string | undefined) => {
    // Convert string to DatasourceSelector if needed
    const datasourceValue: DatasourceSelector | undefined =
      typeof newDatasource === 'string'
        ? { kind: 'SQLDatasource', name: newDatasource }
        : (newDatasource as DatasourceSelector | undefined);

    onChange({ ...value, datasource: datasourceValue });
  };

  return (
    <Stack spacing={2}>
      <DatasourceSelect
        datasourcePluginKind="SQLDatasource"
        value={value?.datasource || { kind: 'SQLDatasource' }}
        onChange={handleDatasourceChange}
      />

      <TextField
        fullWidth
        multiline
        rows={6}
        label="SQL Query"
        placeholder="SELECT time, value FROM metrics WHERE $__timeFilter(time)"
        value={value.query || ''}
        onChange={(e) => onChange({ ...value, query: e.target.value })}
        helperText="Available macros: $__timeFrom, $__timeTo, $__timeFilter(column), $__interval, $__interval_ms"
      />

      <TextField
        fullWidth
        label="Time Column"
        placeholder="time"
        value={value.timeColumn || ''}
        onChange={(e) => onChange({ ...value, timeColumn: e.target.value })}
        helperText="Name of the timestamp column in the result set (default: auto-detect)"
      />

      <TextField
        fullWidth
        type="number"
        label="Min Step (seconds)"
        placeholder="15"
        value={value.minStep || ''}
        onChange={(e) => onChange({ ...value, minStep: parseInt(e.target.value, 10) })}
        helperText="Minimum interval for data aggregation"
      />
    </Stack>
  );
}
