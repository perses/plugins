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
import { FormControl, Stack, TextField, Autocomplete } from '@mui/material';
import {
  DatasourceSelect,
  DatasourceSelectProps,
  OptionsEditorProps,
  isVariableDatasource,
  useDatasourceSelectValueToSelector,
} from '@perses-dev/plugin-system';
import { produce } from 'immer';
import { ReactElement, useCallback, useState, useMemo, SyntheticEvent } from 'react';
import {
  DEFAULT_VICTORIALOGS,
  isDefaultVictoriaLogsSelector,
  isVictoriaLogsDatasourceSelector,
  VICTORIALOGS_DATASOURCE_KIND,
  VictoriaLogsClient,
  VictoriaLogsDatasourceSelector,
} from '../../model';
import {
  VictoriaLogsFieldValuesVariableOptions,
} from '../types';
import { useFieldNames } from '../utils';

export function VictoriaLogsFieldValuesVariableEditor(
  props: OptionsEditorProps<VictoriaLogsFieldValuesVariableOptions>
): ReactElement {
  const {
    onChange,
    value,
    value: { datasource, query, field },
    queryHandlerSettings,
  } = props;
  const datasourceSelectValue = datasource ?? DEFAULT_VICTORIALOGS;
  const selectedDatasource = useDatasourceSelectValueToSelector(
    datasourceSelectValue,
    VICTORIALOGS_DATASOURCE_KIND
  ) as VictoriaLogsDatasourceSelector;
  const { data: fieldNames, isLoading: isFieldNamesOptionsLoading } = useFieldNames(query, selectedDatasource);
  const handleDatasourceChange: DatasourceSelectProps['onChange'] = useCallback(
    (next) => {
      if (isVariableDatasource(next) || isVictoriaLogsDatasourceSelector(next)) {
        onChange(
          produce(value, (draft) => {
            // If they're using the default, just omit the datasource prop (i.e. set to undefined)
            draft.datasource = !isVariableDatasource(next) && isDefaultVictoriaLogsSelector(next) ? undefined : next;
          })
        );
        if (queryHandlerSettings?.setWatchOtherSpecs)
          queryHandlerSettings.setWatchOtherSpecs({ ...value, datasource: next });
        return;
      }

      throw new Error('Got unexpected non-VictoriaLogs datasource selector');
    },
    [onChange, queryHandlerSettings, value]
  );

  const handleQueryChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(
        produce(value, (draft) => {
          draft.query = event.target.value;
        })
      );
      if (queryHandlerSettings?.watchQueryChanges) {
        queryHandlerSettings.watchQueryChanges(event.target.value);
      }
    },
    [onChange, queryHandlerSettings, value]
  );

  const handleFieldChange = useCallback(
    (_: SyntheticEvent, newValue: string | null) => {
      onChange(
        produce(value, (draft) => {
          draft.field = newValue || "";
        })
      );
      if (queryHandlerSettings?.setWatchOtherSpecs) {
        queryHandlerSettings.setWatchOtherSpecs({ ...value, field: newValue });
      }
    },
    [onChange, queryHandlerSettings, value]
  );

  const fieldNamesOptions = useMemo(() => {
    return fieldNames?.values.map(o => o.value) || [];
  }, [isFieldNamesOptionsLoading, fieldNames]);

  return (
    <Stack spacing={2}>
      <FormControl margin="dense">
        <DatasourceSelect
          datasourcePluginKind="VictoriaLogsDatasource"
          value={datasourceSelectValue}
          onChange={handleDatasourceChange}
          readOnly={props.isReadonly}
          labelId="victorialogs-datasource-field"
          label="VictoriaLogs Datasource"
        />
      </FormControl>

      <Autocomplete
        freeSolo
        disableClearable
        value={field}
        loading={isFieldNamesOptionsLoading}
        options={fieldNamesOptions}
        renderInput={(params) => {
          return (
            <TextField
              {...params}
              required
              label="Field Name"
              variant="outlined"
            />
          );
        }}
        onChange={handleFieldChange}
      />
      <TextField
        required
        label="Query"
        InputLabelProps={{ shrink: props.isReadonly ? true : undefined }}
        InputProps={{
          readOnly: props.isReadonly,
        }}
        value={query}
        onChange={handleQueryChange}
      />
    </Stack>
  );
}
