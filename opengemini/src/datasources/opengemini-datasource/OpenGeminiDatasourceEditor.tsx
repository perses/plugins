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

import { HTTPSettingsEditor, OptionsEditorProps } from '@perses-dev/plugin-system';
import React, { ReactElement, ChangeEvent } from 'react';
import { Stack, TextField } from '@mui/material';
import { OpenGeminiDatasourceSpec } from './opengemini-datasource-types';

export type OpenGeminiDatasourceEditorProps = OptionsEditorProps<OpenGeminiDatasourceSpec>;

/**
 * Editor component for OpenGemini datasource configuration.
 * Allows users to configure either a direct URL or proxy settings.
 */
export function OpenGeminiDatasourceEditor(props: OpenGeminiDatasourceEditorProps): ReactElement {
  const { value, onChange, isReadonly } = props;

  const initialSpecDirect: OpenGeminiDatasourceSpec = {
    directUrl: '',
  };

  const initialSpecProxy: OpenGeminiDatasourceSpec = {
    proxy: {
      kind: 'HTTPProxy',
      spec: {
        allowedEndpoints: [
          {
            endpointPattern: '/query',
            method: 'GET',
          },
          {
            endpointPattern: '/write',
            method: 'POST',
          },
        ],
        url: '',
      },
    },
  };

  const handleDatabaseChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      database: event.target.value,
    });
  };

  return (
    <Stack spacing={2}>
      <HTTPSettingsEditor
        value={value}
        onChange={onChange}
        isReadonly={isReadonly}
        initialSpecDirect={initialSpecDirect}
        initialSpecProxy={initialSpecProxy}
      />
      <TextField
        label="Database"
        value={value.database ?? ''}
        onChange={handleDatabaseChange}
        disabled={isReadonly}
        placeholder="Enter database name"
        fullWidth
        required
        helperText="The OpenGemini database to query."
      />
    </Stack>
  );
}
