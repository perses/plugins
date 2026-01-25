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

import { Stack, TextField, MenuItem, Select, FormControl, InputLabel, FormHelperText } from '@mui/material';
import { useWatch } from 'react-hook-form';
import { OptionsEditorProps } from '@perses-dev/plugin-system';
import { SQLDatasourceSpec, SQLProxySpec, SQLDriver, SSLMode } from './sql-datasource-types';

const SQL_DRIVERS: Array<{ value: SQLDriver; label: string }> = [
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'mariadb', label: 'MariaDB' },
];

const SSL_MODES: Array<{ value: SSLMode; label: string }> = [
  { value: 'disable', label: 'Disable' },
  { value: 'require', label: 'Require' },
  { value: 'verify-ca', label: 'Verify CA' },
  { value: 'verify-full', label: 'Verify Full' },
];

export function SQLDatasourceEditor(props: OptionsEditorProps<SQLDatasourceSpec>) {
  const { value, onChange } = props;

  // Access the actual config through proxy.spec
  const config = value?.proxy?.spec || ({} as SQLProxySpec);

  // Use useWatch to watch the driver field
  const driver = useWatch({ name: 'proxy.spec.driver', defaultValue: config.driver || 'postgres' });

  const handleChange = (field: keyof SQLProxySpec, fieldValue: unknown) => {
    onChange({
      proxy: {
        kind: 'SQLProxy',
        spec: {
          ...config,
          [field]: fieldValue,
        },
      },
    });
  };

  const handleNestedChange = (parent: 'mysql' | 'postgres', field: string, fieldValue: unknown) => {
    onChange({
      proxy: {
        kind: 'SQLProxy',
        spec: {
          ...config,
          [parent]: {
            ...config[parent],
            [field]: fieldValue,
          },
        },
      },
    });
  };

  return (
    <Stack spacing={2}>
      <FormControl fullWidth>
        <InputLabel>Database Driver</InputLabel>
        <Select
          value={config.driver || 'postgres'}
          onChange={(e) => handleChange('driver', e.target.value)}
          label="Database Driver"
        >
          {SQL_DRIVERS.map((d) => (
            <MenuItem key={d.value} value={d.value}>
              {d.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        fullWidth
        label="Host"
        placeholder="localhost:5432"
        value={config.host || ''}
        onChange={(e) => handleChange('host', e.target.value)}
        helperText="Format: hostname:port"
        required
      />

      <TextField
        fullWidth
        label="Database"
        placeholder="mydb"
        value={config.database || ''}
        onChange={(e) => handleChange('database', e.target.value)}
        helperText="Database name"
        required
      />

      <TextField
        fullWidth
        label="Secret (optional)"
        placeholder="my-db-secret"
        value={config.secret || ''}
        onChange={(e) => handleChange('secret', e.target.value)}
        helperText="Secret containing credentials and TLS certificates"
      />

      {driver === 'postgres' && (
        <>
          <FormControl fullWidth>
            <InputLabel>SSL Mode</InputLabel>
            <Select
              value={config.postgres?.sslMode || 'disable'}
              onChange={(e) => handleNestedChange('postgres', 'sslMode', e.target.value)}
              label="SSL Mode"
            >
              {SSL_MODES.map((mode) => (
                <MenuItem key={mode.value} value={mode.value}>
                  {mode.label}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>For TLS certificates, create a Secret with TLS config</FormHelperText>
          </FormControl>

          <TextField
            type="number"
            fullWidth
            label="Max Connections (optional)"
            placeholder="25"
            value={config.postgres?.maxConns || ''}
            onChange={(e) => handleNestedChange('postgres', 'maxConns', parseInt(e.target.value) || undefined)}
            helperText="Maximum number of connections in the pool"
          />

          <TextField
            fullWidth
            label="Connect Timeout (optional)"
            placeholder="30s"
            value={config.postgres?.connectTimeout || ''}
            onChange={(e) => handleNestedChange('postgres', 'connectTimeout', e.target.value)}
            helperText="Connection timeout (e.g., 30s, 1m)"
          />
        </>
      )}

      {(driver === 'mysql' || driver === 'mariadb') && (
        <>
          <TextField
            fullWidth
            label="Timeout (optional)"
            placeholder="30s"
            value={config.mysql?.timeout || ''}
            onChange={(e) => handleNestedChange('mysql', 'timeout', e.target.value)}
            helperText="Connection timeout (e.g., 30s, 1m)"
          />

          <TextField
            fullWidth
            label="Read Timeout (optional)"
            placeholder="30s"
            value={config.mysql?.readTimeout || ''}
            onChange={(e) => handleNestedChange('mysql', 'readTimeout', e.target.value)}
            helperText="I/O read timeout"
          />

          <TextField
            fullWidth
            label="Write Timeout (optional)"
            placeholder="30s"
            value={config.mysql?.writeTimeout || ''}
            onChange={(e) => handleNestedChange('mysql', 'writeTimeout', e.target.value)}
            helperText="I/O write timeout"
          />
        </>
      )}
    </Stack>
  );
}
