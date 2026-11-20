// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Stack, TextField, Typography } from '@mui/material';
import { HTTPSettingsEditor } from '@perses-dev/plugin-system';
import type { HTTPDatasourceSpec } from '@perses-dev/spec';
import type { ReactElement } from 'react';
import { useState } from 'react';

import type { AzureResourceManagerDatasourceSpec } from './azure-resource-manager-datasource-types';
import { AZURE_MANAGEMENT_API_URL, AZURE_RESOURCE_GRAPH_MAX_REQUESTS_PER_QUERY_DEFAULT } from './constants';

export interface AzureResourceManagerDatasourceEditorProps {
  value: AzureResourceManagerDatasourceSpec;
  onChange: (next: AzureResourceManagerDatasourceSpec) => void;
  isReadonly?: boolean;
}

type LocalFieldState = Pick<AzureResourceManagerDatasourceSpec, 'maxRequestsPerQuery'>;

function toLocalFieldState(spec: AzureResourceManagerDatasourceSpec): LocalFieldState {
  return {
    maxRequestsPerQuery: spec.maxRequestsPerQuery,
  };
}

export function AzureResourceManagerDatasourceEditor(props: AzureResourceManagerDatasourceEditorProps): ReactElement {
  const { value, onChange, isReadonly } = props;
  const [prevValue, setPrevValue] = useState(value);
  const [localFields, setLocalFields] = useState(() => toLocalFieldState(value));
  if (value !== prevValue) {
    setPrevValue(value);
    setLocalFields(toLocalFieldState(value));
  }

  const handleFieldChange =
    (field: keyof LocalFieldState) =>
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setLocalFields({
        ...localFields,
        [field]: isNaN(Number(event.target.value)) ? undefined : Number(event.target.value),
      });
    };

  const handleFieldBlur = (field: keyof LocalFieldState) => (): void => {
    const newValue = localFields[field];
    if (newValue !== value[field]) {
      onChange({ ...value, [field]: newValue });
    }
  };

  const initialSpecDirect: HTTPDatasourceSpec = {
    directUrl: AZURE_MANAGEMENT_API_URL,
  };

  const initialSpecProxy: HTTPDatasourceSpec = {
    proxy: {
      kind: 'HTTPProxy',
      spec: {
        allowedEndpoints: [
          {
            endpointPattern: '/providers/Microsoft.ResourceGraph/resources',
            method: 'POST',
          },
        ],
        url: AZURE_MANAGEMENT_API_URL,
      },
    },
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
      <Typography variant="h4" mt={2} mb={1}>
        Large Query Options
      </Typography>
      <TextField
        size="small"
        label="Max requests per query"
        type="number"
        placeholder={`e.g. ${AZURE_RESOURCE_GRAPH_MAX_REQUESTS_PER_QUERY_DEFAULT}`}
        helperText="When paginated results are returned, cap the number of pages retrieved. Each page is typically up to 1000 results."
        value={localFields.maxRequestsPerQuery ?? AZURE_RESOURCE_GRAPH_MAX_REQUESTS_PER_QUERY_DEFAULT}
        onChange={handleFieldChange('maxRequestsPerQuery')}
        onBlur={handleFieldBlur('maxRequestsPerQuery')}
      />
    </Stack>
  );
}
