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
import type { OptionsEditorProps } from '@perses-dev/plugin-system';
import { HTTPSettingsEditor } from '@perses-dev/plugin-system';
import type { ReactElement } from 'react';
import { useState } from 'react';

import { parseNumber } from '../../utils';
import type { AzureRegionalMetricsDatasourceSpec } from './azure-regional-metrics-datasource-types';
import { AZURE_METRICS_BATCH_MAX_REQUESTS_PER_QUERY_DEFAULT } from './constants';

type AzureRegionalMetricsDatasourceEditorProps = OptionsEditorProps<AzureRegionalMetricsDatasourceSpec>;

type OptionalNumberField = 'maxRequestsPerQuery'; // stored locally as a string and converted to number on commit

interface LocalFieldState extends Record<OptionalNumberField, string> {}

function toLocalFieldState(spec: AzureRegionalMetricsDatasourceSpec): LocalFieldState {
  return {
    maxRequestsPerQuery: spec.maxRequestsPerQuery?.toString() ?? '',
  };
}

export function AzureRegionalMetricsDatasourceEditor(props: AzureRegionalMetricsDatasourceEditorProps): ReactElement {
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
        [field]: event.target.value,
      });
    };

  const commitOptionalNumberField = (field: OptionalNumberField) => (): void => {
    const newValue = parseNumber(localFields[field]);
    if (newValue !== value[field]) {
      onChange({ ...value, [field]: newValue });
    }
  };

  const initialSpecDirect: AzureRegionalMetricsDatasourceSpec = {
    directUrl: '',
    maxRequestsPerQuery: AZURE_METRICS_BATCH_MAX_REQUESTS_PER_QUERY_DEFAULT,
  };

  const initialSpecProxy: AzureRegionalMetricsDatasourceSpec = {
    proxy: {
      kind: 'HTTPProxy',
      spec: {
        allowedEndpoints: [
          {
            endpointPattern: '/subscriptions/.*/metrics:getBatch',
            method: 'POST',
          },
        ],
        url: '',
      },
    },
    maxRequestsPerQuery: AZURE_METRICS_BATCH_MAX_REQUESTS_PER_QUERY_DEFAULT,
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
        placeholder={`e.g. ${AZURE_METRICS_BATCH_MAX_REQUESTS_PER_QUERY_DEFAULT}`}
        helperText="Each request to Azure only supports up to 50 resource IDs. Multiple requests, up to the max, will be made to cover all resources."
        value={localFields.maxRequestsPerQuery ?? AZURE_METRICS_BATCH_MAX_REQUESTS_PER_QUERY_DEFAULT}
        onChange={handleFieldChange('maxRequestsPerQuery')}
        onBlur={commitOptionalNumberField('maxRequestsPerQuery')}
      />
    </Stack>
  );
}
