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
import { HTTPSettingsEditor } from '@perses-dev/plugin-system';
import { HTTPDatasourceSpec } from '@perses-dev/core';
import React, { ReactElement } from 'react';
import { InfluxDBSpec } from './InfluxDBDatasource';
export interface InfluxDBEditorProps {
  value: InfluxDBSpec;
  onChange: (next: InfluxDBSpec) => void;
  isReadonly?: boolean;
}
export function InfluxDBEditor(props: InfluxDBEditorProps): ReactElement {
  const { value, onChange, isReadonly } = props;
  const version = value?.version || 'v1';
  // Version-specific AllowedEndpoints
  const allowedEndpointsV1 = [
    {
      endpointPattern: '/query',
      method: 'GET',
    },
  ];
  const allowedEndpointsV3 = [
    {
      endpointPattern: '/api/v3/query_sql',
      method: 'GET',
    },
    {
      endpointPattern: '/api/v3/query_influxql',
      method: 'GET',
    },
  ];
  // Build initial specs with version-specific endpoints
  const initialSpecDirectV1: HTTPDatasourceSpec = {
    directUrl: '',
  };
  const initialSpecProxyV1: HTTPDatasourceSpec = {
    proxy: {
      kind: 'HTTPProxy',
      spec: {
        allowedEndpoints: allowedEndpointsV1,
        url: '',
      },
    },
  };
  const initialSpecDirectV3: HTTPDatasourceSpec = {
    directUrl: '',
  };
  const initialSpecProxyV3: HTTPDatasourceSpec = {
    proxy: {
      kind: 'HTTPProxy',
      spec: {
        allowedEndpoints: allowedEndpointsV3,
        url: '',
      },
    },
  };
  // Select the right initial specs based on current version
  const initialSpecDirect = version === 'v1' ? initialSpecDirectV1 : initialSpecDirectV3;
  const initialSpecProxy = version === 'v1' ? initialSpecProxyV1 : initialSpecProxyV3;
  // Handle changes from HTTP Settings
  const handleHTTPSettingsChange = (next: HTTPDatasourceSpec) => {
    const updated = { ...value, ...next };
    // If this is a proxy config, ensure it has the correct version-specific endpoints
    if (updated.proxy?.spec) {
      const correctEndpoints = version === 'v1' ? allowedEndpointsV1 : allowedEndpointsV3;
      onChange({
        ...updated,
        proxy: {
          ...updated.proxy,
          spec: {
            ...updated.proxy.spec,
            allowedEndpoints: correctEndpoints,
          },
        },
      } as InfluxDBSpec);
    } else {
      onChange(updated as InfluxDBSpec);
    }
  };
  return (
    <Stack gap={3} sx={{ width: '100%' }}>
      {/* 1. Version Selection FIRST */}
      <Box>
        <FormControl fullWidth>
          <InputLabel id="version-select-label">Version</InputLabel>
          <Select
            labelId="version-select-label"
            id="version-select"
            value={version}
            label="Version"
            onChange={(e) => {
              const newVersion = e.target.value as 'v1' | 'v3';
              const updated = { ...value, version: newVersion };
              // If they have a proxy config, update the endpoints
              if (updated.proxy?.spec) {
                const correctEndpoints = newVersion === 'v1' ? allowedEndpointsV1 : allowedEndpointsV3;
                onChange({
                  ...updated,
                  proxy: {
                    ...updated.proxy,
                    spec: {
                      ...updated.proxy.spec,
                      allowedEndpoints: correctEndpoints,
                    },
                  },
                });
              } else {
                onChange(updated);
              }
            }}
            disabled={isReadonly}
          >
            <MenuItem value="v1">InfluxDB v1</MenuItem>
            <MenuItem value="v3">InfluxDB v3</MenuItem>
          </Select>
        </FormControl>
      </Box>
      {/* 2. HTTP Settings (Direct/Proxy) with version-specific endpoints */}
      <HTTPSettingsEditor
        value={value as HTTPDatasourceSpec}
        onChange={handleHTTPSettingsChange}
        isReadonly={isReadonly}
        initialSpecDirect={initialSpecDirect}
        initialSpecProxy={initialSpecProxy}
      />
      {/* 3. Version-Specific Fields */}
      {version === 'v1' && (
        <Box sx={{ borderTop: '1px solid #e0e0e0', pt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            InfluxDB v1 Configuration
          </Typography>
          <Stack gap={2}>
            <TextField
              label="Database"
              value={value?.database || ''}
              onChange={(e) => onChange({ ...value, database: e.target.value })}
              placeholder="e.g., mydb"
              disabled={isReadonly}
              fullWidth
              helperText="Name of the InfluxDB database"
            />
            <TextField
              label="Authentication Secret"
              value={value?.auth || ''}
              onChange={(e) => onChange({ ...value, auth: e.target.value })}
              placeholder="Secret name containing credentials"
              disabled={isReadonly}
              fullWidth
              helperText="Name of the secret containing username/password"
            />
          </Stack>
        </Box>
      )}
      {version === 'v3' && (
        <Box sx={{ borderTop: '1px solid #e0e0e0', pt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            InfluxDB v3 Configuration
          </Typography>
          <Stack gap={2}>
            <TextField
              label="Organization"
              value={value?.organization || ''}
              onChange={(e) => onChange({ ...value, organization: e.target.value })}
              placeholder="e.g., myorg"
              disabled={isReadonly}
              fullWidth
              helperText="Name of the InfluxDB organization"
            />
            <TextField
              label="Bucket"
              value={value?.bucket || ''}
              onChange={(e) => onChange({ ...value, bucket: e.target.value })}
              placeholder="e.g., mybucket"
              disabled={isReadonly}
              fullWidth
              helperText="Name of the InfluxDB bucket"
            />
            <TextField
              label="Authentication Secret"
              value={value?.auth || ''}
              onChange={(e) => onChange({ ...value, auth: e.target.value })}
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
