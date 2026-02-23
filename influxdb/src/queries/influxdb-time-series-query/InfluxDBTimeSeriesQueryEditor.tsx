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
import { TextField, Box } from '@mui/material';
import { DatasourceSelect, DatasourceSelectProps, OptionsEditorProps } from '@perses-dev/plugin-system';
import { DatasourceSelector } from '@perses-dev/core';
import { InfluxDBTimeSeriesQuerySpec } from './InfluxDBTimeSeriesQuery';
const DATASOURCE_KIND = 'InfluxDBDatasource';
export function InfluxDBTimeSeriesQueryEditor({ value, onChange }: OptionsEditorProps<InfluxDBTimeSeriesQuerySpec>) {
  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (newDatasource) => {
    // Cast through unknown to handle type mismatch
    const datasourceSelector = newDatasource as unknown as DatasourceSelector;
    onChange({ ...value, datasource: datasourceSelector });
  };
  const defaultDatasource: DatasourceSelector = {
    kind: DATASOURCE_KIND,
  };
  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <DatasourceSelect
        value={value?.datasource ?? defaultDatasource}
        onChange={handleDatasourceChange}
        datasourcePluginKind={DATASOURCE_KIND}
      />
      <TextField
        label="Query"
        placeholder="SELECT * FROM measurement WHERE time > now() - 1h"
        value={value?.query || ''}
        onChange={(e) => onChange({ ...value, query: e.target.value })}
        helperText="SQL query for InfluxDB v3 or InfluxQL for v1"
        required
        fullWidth
        multiline
        rows={6}
      />
    </Box>
  );
}
