// Copyright 2025 The Perses Authors
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

import { DatasourceSelect, DatasourceSelectProps } from '@perses-dev/plugin-system';
import { useId } from '@perses-dev/components';
import { produce } from 'immer';
import { FormControl, InputLabel, Stack, TextField } from '@mui/material';
import { ReactElement } from 'react';
import {
  DEFAULT_PYROSCOPE,
  isDefaultPyroscopeSelector,
  isPyroscopeDatasourceSelector,
  PYROSCOPE_DATASOURCE_KIND,
} from '../../model/pyroscope-selectors';
import { ProfileType, Service, Filters } from '../../components';
import {
  ProfileQueryEditorProps,
  useMaxNodesState,
  useProfileTypeState,
  useServiceState,
  useFiltersState,
} from './query-editor-model';

export function PyroscopeProfileQueryEditor(props: ProfileQueryEditorProps): ReactElement {
  const { onChange, value } = props;
  const { datasource } = value;
  const selectedDatasource = datasource ?? DEFAULT_PYROSCOPE;
  const datasourceSelectLabelID = useId('pyroscope-datasource-label');

  const { maxNodes, handleMaxNodesChange, maxNodesHasError } = useMaxNodesState(props);
  const { profileType, handleProfileTypeChange } = useProfileTypeState(props);
  const { service, handleServiceChange } = useServiceState(props);
  const { filters, handleFiltersChange } = useFiltersState(props);

  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (next) => {
    // Check if the next value is a DatasourceSelector
    if (typeof next === 'object' && 'kind' in next && 'name' in next) {
      if (isPyroscopeDatasourceSelector(next)) {
        onChange(
          produce(value, (draft) => {
            // If they're using the default, just omit the datasource prop (i.e. set to undefined)
            const nextDatasource = isDefaultPyroscopeSelector(next) ? undefined : next;
            draft.datasource = nextDatasource;
          })
        );
        return;
      }
    }

    throw new Error('Got unexpected non-Pyroscope datasource selector');
  };

  return (
    <Stack spacing={2}>
      <FormControl margin="dense" fullWidth={false}>
        <InputLabel id={datasourceSelectLabelID} shrink>
          Pyroscope Datasource
        </InputLabel>
        <DatasourceSelect
          datasourcePluginKind={PYROSCOPE_DATASOURCE_KIND}
          value={selectedDatasource}
          onChange={handleDatasourceChange}
          labelId={datasourceSelectLabelID}
          label="Pyroscope Datasource"
          notched
        />
      </FormControl>
      <Stack direction="row" spacing={2}>
        <Service datasource={selectedDatasource} value={service} onChange={handleServiceChange} />
        <ProfileType datasource={selectedDatasource} value={profileType} onChange={handleProfileTypeChange} />
        <TextField
          size="small"
          label="Max Nodes"
          value={maxNodes}
          error={maxNodesHasError}
          onChange={(e) => handleMaxNodesChange(e.target.value)}
          sx={{ width: '110px' }}
        />
      </Stack>
      <Filters datasource={selectedDatasource} value={filters} onChange={handleFiltersChange} />
    </Stack>
  );
}
