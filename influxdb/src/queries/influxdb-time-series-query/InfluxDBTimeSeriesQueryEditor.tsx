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
import { TextField, Box, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { DatasourceSelect, DatasourceSelectProps, OptionsEditorProps } from '@perses-dev/plugin-system';
import { DatasourceSelector } from '@perses-dev/core';
import { ReactElement } from 'react';
import { InfluxDBTimeSeriesQuerySpec, InfluxDBQueryLanguage } from './influxdb-time-series-query-types';
const DATASOURCE_KIND = 'InfluxDBDatasource';
export function InfluxDBTimeSeriesQueryEditor({
  value,
  onChange,
}: OptionsEditorProps<InfluxDBTimeSeriesQuerySpec>): ReactElement {
  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (newDatasource) => {
    const datasourceSelector = newDatasource as unknown as DatasourceSelector;
    onChange({ ...value, datasource: datasourceSelector });
  };
  const defaultDatasource: DatasourceSelector = {
    kind: DATASOURCE_KIND,
  };
  const queryLanguage: InfluxDBQueryLanguage = value?.queryLanguage ?? 'influxql';
  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <DatasourceSelect
        value={value?.datasource ?? defaultDatasource}
        onChange={handleDatasourceChange}
        datasourcePluginKind={DATASOURCE_KIND}
      />
      <FormControl fullWidth>
        <InputLabel id="query-language-label">Query Language</InputLabel>
        <Select
          labelId="query-language-label"
          value={queryLanguage}
          label="Query Language"
          onChange={(e) => onChange({ ...value, queryLanguage: e.target.value as InfluxDBQueryLanguage })}
        >
          <MenuItem value="influxql">InfluxQL (v1)</MenuItem>
          <MenuItem value="sql">SQL (v3)</MenuItem>
          <MenuItem value="flux">Flux (v3)</MenuItem>
        </Select>
      </FormControl>
      <TextField
        label="Query"
        placeholder={
          queryLanguage === 'sql'
            ? 'SELECT * FROM measurement WHERE $__timeFilter(time)'
            : queryLanguage === 'flux'
              ? 'from(bucket: "mybucket") |> range(start: $__timeFrom, stop: $__timeTo)'
              : 'SELECT * FROM measurement WHERE time > now() - 1h'
        }
        value={value?.query || ''}
        onChange={(e) => onChange({ ...value, query: e.target.value })}
        helperText={
          queryLanguage === 'sql'
            ? 'SQL query for InfluxDB v3'
            : queryLanguage === 'flux'
              ? 'Flux query for InfluxDB v3'
              : 'InfluxQL query for InfluxDB v1'
        }
        required
        fullWidth
        multiline
        rows={6}
      />
    </Box>
  );
}
