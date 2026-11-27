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

import type { ClickStackDatasourceSpec } from './click-stack-datasource-types';

export type ClickStackDatasourceEditorProps = DatasourceEditorProps<ClickStackDatasourceSpec>;

const initialSpecDirect: ClickStackDatasourceSpec = {
  directUrl: '',
};

// ClickStack only answers to the browsers of its own UI and needs an API key: it is reached through the proxy,
// with a secret holding the key as a bearer token.
const initialSpecProxy: ClickStackDatasourceSpec = {
  proxy: {
    kind: 'HTTPProxy',
    spec: {
      allowedEndpoints: [
        {
          endpointPattern: '^/api/v2/alerts$',
          method: 'GET',
        },
        // Connection test
        {
          endpointPattern: '^/api/v2$',
          method: 'GET',
        },
      ],
      url: '',
    },
  },
};

export function ClickStackDatasourceEditor(props: ClickStackDatasourceEditorProps): ReactElement {
  const { value, onChange, isReadonly, testConnection } = props;

  return (
    <>
      <Typography variant="h4" mb={2}>
        General Settings
      </Typography>
      <TextField
        size="small"
        fullWidth
        label="ClickStack UI URL"
        value={value.uiUrl ?? ''}
        placeholder="https://clickstack.example.com"
        slotProps={{
          input: { readOnly: isReadonly },
          // Above the field, so that the placeholder is visible.
          inputLabel: { shrink: true },
        }}
        onChange={(event) => onChange({ ...value, uiUrl: event.target.value || undefined })}
        helperText="URL of the ClickStack UI, as you open it in your browser. Alerts link to the dashboard or the saved search they watch. Leave it empty for alerts without links."
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
