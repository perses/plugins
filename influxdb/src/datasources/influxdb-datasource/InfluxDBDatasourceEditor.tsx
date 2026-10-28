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

import { TextField, Box, Stack, FormControl, InputLabel, Select, MenuItem, Typography } from '@mui/material';
import { HTTPSettingsEditor, OptionsEditorProps } from '@perses-dev/plugin-system';
import { HTTPDatasourceSpec } from '@perses-dev/core';
import { ReactElement } from 'react';
import { InfluxDBSpec } from './influxdb-datasource-types';

const ALLOWED_ENDPOINTS_V1 = [{ endpointPattern: '/query', method: 'GET' }];
const ALLOWED_ENDPOINTS_V3 = [
  { endpointPattern: '/api/v3/query_sql', method: 'POST' },
  { endpointPattern: '/api/v2/query', method: 'POST' },
];

export function InfluxDBDatasourceEditor({
  value,
  onChange,
  isReadonly,
}: OptionsEditorProps<InfluxDBSpec>): ReactElement {
  const version = value?.version ?? 'v1';

  const initialSpecProxy: HTTPDatasourceSpec = {
    proxy: {
      kind: 'HTTPProxy',
      spec: {
        allowedEndpoints: version === 'v1' ? ALLOWED_ENDPOINTS_V1 : ALLOWED_ENDPOINTS_V3,
        url: '',
      },
    },
  };
  const initialSpecDirect: HTTPDatasourceSpec = { directUrl: '' };

  const handleHTTPSettingsChange = (next: HTTPDatasourceSpec): void => {
    const updated = { ...value, ...next } as InfluxDBSpec;
    if (updated.proxy?.spec) {
      onChange({
        ...updated,
        proxy: {
          ...updated.proxy,
          spec: {
            ...updated.proxy.spec,
            allowedEndpoints: version === 'v1' ? ALLOWED_ENDPOINTS_V1 : ALLOWED_ENDPOINTS_V3,
          },
        },
      } as InfluxDBSpec);
    } else {
      onChange(updated);
    }
  };

  const handleVersionChange = (newVersion: 'v1' | 'v3'): void => {
    const updated = { ...value, version: newVersion } as InfluxDBSpec;
    if (updated.proxy?.spec) {
      onChange({
        ...updated,
        proxy: {
          ...updated.proxy,
          spec: {
            ...updated.proxy.spec,
            allowedEndpoints: newVersion === 'v1' ? ALLOWED_ENDPOINTS_V1 : ALLOWED_ENDPOINTS_V3,
          },
        },
      } as InfluxDBSpec);
    } else {
      onChange(updated);
    }
  };

  return (
    <Stack gap={3} sx={{ width: '100%' }}>
      <Box>
        <FormControl fullWidth>
          <InputLabel id="version-select-label">Version</InputLabel>
          <Select
            labelId="version-select-label"
            value={version}
            label="Version"
            onChange={(e) => handleVersionChange(e.target.value as 'v1' | 'v3')}
            disabled={isReadonly}
          >
            <MenuItem value="v1">InfluxDB v1</MenuItem>
            <MenuItem value="v3">InfluxDB v3</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <HTTPSettingsEditor
        value={value as HTTPDatasourceSpec}
        onChange={handleHTTPSettingsChange}
        isReadonly={isReadonly}
        initialSpecDirect={initialSpecDirect}
        initialSpecProxy={initialSpecProxy}
      />

      {version === 'v1' && (
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            InfluxDB v1 Configuration
          </Typography>
          <Stack gap={2}>
            <TextField
              label="Database"
              value={value?.database ?? ''}
              onChange={(e) => onChange({ ...value, database: e.target.value } as InfluxDBSpec)}
              placeholder="e.g., mydb"
              disabled={isReadonly}
              fullWidth
              helperText="Name of the InfluxDB database"
            />
            <TextField
              label="Authentication Secret"
              value={value?.auth ?? ''}
              onChange={(e) => onChange({ ...value, auth: e.target.value } as InfluxDBSpec)}
              placeholder="Secret name containing credentials"
              disabled={isReadonly}
              fullWidth
              helperText="Name of the secret containing username/password"
            />
          </Stack>
        </Box>
      )}

      {version === 'v3' && (
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            InfluxDB v3 Configuration
          </Typography>
          <Stack gap={2}>
            <TextField
              label="Organization"
              value={value?.organization ?? ''}
              onChange={(e) => onChange({ ...value, organization: e.target.value } as InfluxDBSpec)}
              placeholder="e.g., myorg"
              disabled={isReadonly}
              fullWidth
              helperText="Name of the InfluxDB organization"
            />
            <TextField
              label="Bucket"
              value={value?.bucket ?? ''}
              onChange={(e) => onChange({ ...value, bucket: e.target.value } as InfluxDBSpec)}
              placeholder="e.g., mybucket"
              disabled={isReadonly}
              fullWidth
              helperText="Name of the InfluxDB bucket"
            />
            <TextField
              label="Authentication Secret"
              value={value?.auth ?? ''}
              onChange={(e) => onChange({ ...value, auth: e.target.value } as InfluxDBSpec)}
              placeholder="Secret name containing token"
              disabled={isReadonly}
              fullWidth
              helperText="Name of the secret containing auth token"
            />
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
