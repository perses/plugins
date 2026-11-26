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

import { TextField, Typography } from '@mui/material';
import type { DatasourceEditorProps } from '@perses-dev/plugin-system';
import { HTTPSettingsEditor } from '@perses-dev/plugin-system';
import type { ReactElement } from 'react';

import type { ClickHouseDatasourceSpec } from './click-house-datasource-types';

export type ClickHouseDatasourceEditorProps = DatasourceEditorProps<ClickHouseDatasourceSpec>;

const initialSpecDirect: ClickHouseDatasourceSpec = {
  directUrl: '',
};

const initialSpecProxy: ClickHouseDatasourceSpec = {
  proxy: {
    kind: 'HTTPProxy',
    spec: {
      allowedEndpoints: [
        // Queries. The plugin sends them with `readonly=2`, but only the grants of the ClickHouse user are a guarantee:
        // connect with a read-only user.
        {
          endpointPattern: '^/$',
          method: 'POST',
        },
        // Connection test
        {
          endpointPattern: '^/ping$',
          method: 'GET',
        },
      ],
      url: '',
    },
  },
};

export function ClickHouseDatasourceEditor(props: ClickHouseDatasourceEditorProps): ReactElement {
  const { value, onChange, isReadonly, testConnection } = props;

  return (
    <>
      <Typography variant="h4" mb={2}>
        General Settings
      </Typography>
      <TextField
        size="small"
        fullWidth
        label="Default database"
        value={value.database ?? ''}
        placeholder="default"
        slotProps={{
          input: { readOnly: isReadonly },
          // Above the field, so that the placeholder is visible.
          inputLabel: { shrink: true },
        }}
        onChange={(event) => onChange({ ...value, database: event.target.value || undefined })}
        helperText="Database of the tables that queries do not qualify, e.g. the one holding the OpenTelemetry tables. Leave it empty to use the database named default."
        sx={{ mb: 2 }}
      />
      <HTTPSettingsEditor
        value={value}
        onChange={onChange}
        isReadonly={isReadonly}
        testConnection={testConnection}
        initialSpecDirect={initialSpecDirect}
        initialSpecProxy={initialSpecProxy}
      />
    </>
  );
}
