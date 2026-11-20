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
import { DatasourceSelect, isVariableDatasource } from '@perses-dev/plugin-system';
import type { ReactElement } from 'react';
import { useState } from 'react';

import type { AzureResourceGraphKqlQuerySpec } from './azure-resource-graph-kql-query-types';
import { DATASOURCE_KIND, DEFAULT_DATASOURCE } from './constants';

type AzureResourceGraphKqlQueryEditorProps = OptionsEditorProps<AzureResourceGraphKqlQuerySpec>;

export function AzureResourceGraphKqlQueryEditor(props: AzureResourceGraphKqlQueryEditorProps): ReactElement {
  const { onChange, value } = props;
  const { datasource } = value;
  const selectedDatasource = datasource ?? DEFAULT_DATASOURCE;
  const [prevQuery, setPrevQuery] = useState(value.kqlQuery);
  const [localQuery, setLocalQuery] = useState(() => value.kqlQuery);
  if (value.kqlQuery !== prevQuery) {
    setPrevQuery(value.kqlQuery);
    setLocalQuery(value.kqlQuery);
  }

  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (newDatasourceSelection) => {
    if (!isVariableDatasource(newDatasourceSelection) && newDatasourceSelection.kind === DATASOURCE_KIND) {
      onChange({ ...value, datasource: newDatasourceSelection });
      return;
    }

    throw new Error('Got unexpected non AzureResourceGraphKqlQuery datasource selection');
  };

  const handleQueryBlur = (event: React.FocusEvent<HTMLInputElement>): void => {
    const newQuery = event.target.value;
    if (newQuery !== value.kqlQuery) {
      onChange({ ...value, kqlQuery: newQuery });
    }
  };

  return (
    <Stack spacing={2}>
      <DatasourceSelect
        datasourcePluginKind={DATASOURCE_KIND}
        value={selectedDatasource}
        onChange={handleDatasourceChange}
        label="AzureResourceGraphKqlQuery Datasource"
        notched
      />
      <TextField
        fullWidth
        label="KQL Query"
        placeholder="Resources | project name, type"
        required
        multiline
        minRows={4}
        onBlur={handleQueryBlur}
        onChange={(e) => setLocalQuery(e.target.value)}
        value={localQuery}
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
