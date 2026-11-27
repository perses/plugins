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

import { Autocomplete, Stack, TextField } from '@mui/material';
import type { DatasourceSelectProps, OptionsEditorProps } from '@perses-dev/plugin-system';
import { DatasourceSelect } from '@perses-dev/plugin-system';
import type { ReactElement } from 'react';
import { useState } from 'react';

import {
  isAzureResourceManagerDatasourceSelector,
  isDefaultAzureResourceManagerDatasourceSelector,
} from '../../datasources';
import type { AzureResourceGraphKqlQuerySpec } from './azure-resource-graph-kql-query-types';
import { DATASOURCE_KIND, DEFAULT_DATASOURCE } from './constants';

type AzureResourceGraphKqlQueryEditorProps = OptionsEditorProps<AzureResourceGraphKqlQuerySpec>;

type RequiredStringField = 'kqlQuery';

interface LocalFieldState extends Record<RequiredStringField, string> {}
function toLocalFieldState(spec: AzureResourceGraphKqlQuerySpec): LocalFieldState {
  return {
    kqlQuery: spec.kqlQuery,
  };
}

export function AzureResourceGraphKqlQueryEditor(props: AzureResourceGraphKqlQueryEditorProps): ReactElement {
  const { onChange, value } = props;
  const { datasource } = value;
  const selectedDatasource = datasource ?? DEFAULT_DATASOURCE;
  const [prevValue, setPrevValue] = useState(value);
  const [localFields, setLocalFields] = useState(() => toLocalFieldState(value));
  if (value !== prevValue) {
    setPrevValue(value);
    setLocalFields(toLocalFieldState(value));
  }

  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (newDatasourceSelection) => {
    if (isAzureResourceManagerDatasourceSelector(newDatasourceSelection)) {
      onChange({
        ...value,
        datasource: isDefaultAzureResourceManagerDatasourceSelector(newDatasourceSelection)
          ? undefined
          : newDatasourceSelection,
      });
      return;
    }

    throw new Error('Got unexpected non AzureResourceManager datasource selection');
  };

  const handleFieldChange =
    (field: keyof LocalFieldState) =>
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setLocalFields({ ...localFields, [field]: event.target.value });
    };

  const commitRequiredStringField = (field: RequiredStringField) => (): void => {
    const newValue = localFields[field];
    if (newValue !== value[field]) {
      onChange({ ...value, [field]: newValue });
    }
  };

  return (
    <Stack spacing={2}>
      <DatasourceSelect
        datasourcePluginKind={DATASOURCE_KIND}
        value={selectedDatasource}
        onChange={handleDatasourceChange}
        label="AzureResourceManager Datasource"
        notched
      />
      <TextField
        fullWidth
        label="KQL Query"
        placeholder="Resources | project name, type"
        required
        multiline
        minRows={4}
        onChange={handleFieldChange('kqlQuery')}
        onBlur={commitRequiredStringField('kqlQuery')}
        value={localFields.kqlQuery}
      />
      <Autocomplete
        multiple
        freeSolo
        disableCloseOnSelect
        options={[]}
        value={value.subscriptions ?? []}
        onChange={(event, newValue): void => {
          onChange({ ...value, subscriptions: newValue.length ? newValue : undefined });
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Subscriptions"
            size="small"
            placeholder="e.g. ${variable:csv} OR 00000000-0000-0000-0000-000000000000"
            helperText="Optional - Limit query to subscription ID list"
          />
        )}
      />
      <Autocomplete
        multiple
        freeSolo
        disableCloseOnSelect
        options={[]}
        value={value.managementGroups ?? []}
        onChange={(event, newValue): void => {
          onChange({ ...value, managementGroups: newValue.length ? newValue : undefined });
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Management Groups"
            size="small"
            placeholder="e.g. ${variable:csv} OR my-management-group"
            helperText="Optional - Limit query to management group ID list"
          />
        )}
      />
    </Stack>
  );
}
