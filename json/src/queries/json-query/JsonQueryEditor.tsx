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

import type { SelectChangeEvent } from '@mui/material';
import {
  Button,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import type { DatasourceSelectProps, OptionsEditorProps } from '@perses-dev/plugin-system';
import { DatasourceSelect } from '@perses-dev/plugin-system';
import { produce } from 'immer';
import CloseIcon from 'mdi-material-ui/Close';
import AddIcon from 'mdi-material-ui/Plus';
import type { ReactElement } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';

import { DATASOURCE_KIND, DEFAULT_DATASOURCE } from './constants';
import { isDefaultJsonDatasourceSelector, isJsonDatasourceSelector } from './json-query-selectors';
import type { HttpMethod, JsonQuerySpec } from './json-query-types';

type JsonQueryEditorProps = OptionsEditorProps<JsonQuerySpec>;

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST'];

interface QueryParamEntry {
  key: string;
  value: string;
}

interface JsonQueryFormValues {
  endpointUrl: string;
  method?: HttpMethod;
  queryParams: QueryParamEntry[];
  body?: string;
  jsonataExpression?: string;
}

function specToForm(spec: JsonQuerySpec): JsonQueryFormValues {
  return {
    endpointUrl: spec.endpointUrl,
    method: spec.method,
    queryParams: Object.entries(spec.queryParams ?? {}).map(([key, value]) => ({ key, value })),
    body: spec.body,
    jsonataExpression: spec.jsonataExpression,
  };
}

function formToSpec(form: JsonQueryFormValues, original: JsonQuerySpec): JsonQuerySpec {
  const queryParams = Object.fromEntries(form.queryParams.map(({ key, value }) => [key, value]));
  return {
    ...original,
    endpointUrl: form.endpointUrl,
    method: form.method,
    queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    body: form.body || undefined,
    jsonataExpression: form.jsonataExpression || undefined,
  };
}

export function JsonQueryEditor(props: JsonQueryEditorProps): ReactElement {
  const { onChange, value } = props;
  const selectedDatasource = value.datasource ?? DEFAULT_DATASOURCE;

  const { register, handleSubmit, control } = useForm<JsonQueryFormValues>({
    mode: 'onBlur',
    defaultValues: specToForm(value),
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'queryParams' });
  const method = useWatch({ control, name: 'method' });

  const commit = handleSubmit((formValues) => {
    onChange(formToSpec(formValues, value));
  });

  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (next) => {
    if (isJsonDatasourceSelector(next)) {
      onChange(
        produce(value, (draft) => {
          draft.datasource = isDefaultJsonDatasourceSelector(next) ? undefined : next;
        }),
      );
      return;
    }
    throw new Error('Got unexpected non-JsonDatasource datasource selector');
  };

  const handleMethodChange = (e: SelectChangeEvent<HttpMethod>): void => {
    onChange(
      produce(value, (draft) => {
        const method = e.target.value as HttpMethod;
        draft.method = method;
        if (method === 'GET') {
          draft.body = undefined;
        }
      }),
    );
  };

  return (
    <Stack spacing={2}>
      <DatasourceSelect
        datasourcePluginKind={DATASOURCE_KIND}
        value={selectedDatasource}
        onChange={handleDatasourceChange}
        label="JSON Datasource"
        notched
      />

      <Stack direction="row" spacing={1} alignItems="flex-start">
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel id="json-method-label">Method</InputLabel>
          <Controller
            name="method"
            control={control}
            render={({ field }) => (
              <Select<HttpMethod>
                {...field}
                labelId="json-method-label"
                label="Method"
                value={field.value ?? 'GET'}
                onChange={(e) => {
                  field.onChange(e);
                  handleMethodChange(e);
                }}
              >
                {HTTP_METHODS.map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
        </FormControl>

        <TextField
          fullWidth
          size="small"
          label="Endpoint URL"
          placeholder="/api/data"
          {...register('endpointUrl', { onBlur: commit })}
        />
      </Stack>

      <Stack spacing={1}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            Query Parameters
          </Typography>
          <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={() => append({ key: '', value: '' })}>
            Add
          </Button>
        </Stack>
        {fields.map((field, index) => (
          <Stack key={field.id} direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              label="Key"
              sx={{ flex: 1 }}
              {...register(`queryParams.${index}.key`, { onBlur: commit })}
            />
            <TextField
              size="small"
              label="Value"
              sx={{ flex: 1 }}
              {...register(`queryParams.${index}.value`, { onBlur: commit })}
            />
            <IconButton
              size="small"
              onClick={() => {
                remove(index);
              }}
              aria-label="Remove parameter"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>

      {(method ?? 'GET') === 'POST' && (
        <TextField
          fullWidth
          size="small"
          label="Request Body"
          placeholder='{"key": "value"}'
          helperText="Optional — JSON body sent with the POST request. Supports variable interpolation."
          multiline
          minRows={3}
          {...register('body', { onBlur: commit })}
        />
      )}

      <Typography variant="body2" color="text.secondary">
        Transformation
      </Typography>
      <TextField
        fullWidth
        size="small"
        label="JSONata Expression"
        placeholder="e.g. data.items.{ 'name': label, 'values': values }"
        helperText="Optional — transform the JSON response with a JSONata expression before using it in the panel."
        multiline
        minRows={2}
        {...register('jsonataExpression', { onBlur: commit })}
      />
    </Stack>
  );
}
