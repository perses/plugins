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
import {
  DatasourceSelect,
  DatasourceSelectProps,
  isVariableDatasource,
  OptionsEditorProps,
} from '@perses-dev/plugin-system';
import { ReactElement } from 'react';
import { SQLTimeSeriesQuerySpec } from './sql-time-series-query-types';

const DATASOURCE_KIND = 'SQLDatasource';

export function SQLTimeSeriesQueryEditor({
  value,
  onChange,
}: OptionsEditorProps<SQLTimeSeriesQuerySpec>): ReactElement {
  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (newDatasource) => {
    if (!isVariableDatasource(newDatasource) && newDatasource.kind === DATASOURCE_KIND) {
      onChange({ ...value, datasource: newDatasource });
    }
  };

  return (
    <Stack spacing={2}>
      <DatasourceSelect
        datasourcePluginKind={DATASOURCE_KIND}
        value={value?.datasource ?? { kind: DATASOURCE_KIND }}
        onChange={handleDatasourceChange}
        label="SQL Datasource"
        notched
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
        onChange={(e) => onChange({ ...value, minStep: parseInt(e.target.value, 10) || undefined })}
        helperText="Minimum interval for data aggregation"
      />
    </Stack>
  );
}
