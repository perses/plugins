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

import {
  Autocomplete,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  TextFieldProps,
} from '@mui/material';
import { useId } from '@perses-dev/components';
import {
  DatasourceSelect,
  DatasourceSelectProps,
  useDatasourceClient,
  useDatasourceSelectValueToSelector,
} from '@perses-dev/plugin-system';
import { produce } from 'immer';
import { ChangeEvent, ReactElement, SyntheticEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_JAEGER,
  JaegerClient,
  isDefaultJaegerSelector,
  isJaegerDatasourceSelector,
  JAEGER_DATASOURCE_KIND,
  JaegerTraceQuerySpec,
} from '../model';

interface JaegerTraceQueryEditorProps {
  value: JaegerTraceQuerySpec;
  onChange: (next: JaegerTraceQuerySpec) => void;
}

type FieldKey = Exclude<keyof JaegerTraceQuerySpec, 'datasource' | 'limit'>;

const limitOptions = [20, 50, 100, 200, 500];
const spanKindOptions = ['', 'internal', 'server', 'client', 'producer', 'consumer'];

export function JaegerTraceQueryEditor(props: JaegerTraceQueryEditorProps): ReactElement {
  const { onChange, value } = props;
  const datasourceSelectValue = value.datasource ?? DEFAULT_JAEGER;
  const selectedDatasource = useDatasourceSelectValueToSelector(datasourceSelectValue, JAEGER_DATASOURCE_KIND);
  const datasourceSelectLabelID = useId('jaeger-datasource-label');
  const { data: client } = useDatasourceClient<JaegerClient>(selectedDatasource);
  const serviceOptions = useServiceOptions(client);
  const operationOptions = useOperationOptions(client, value.service);

  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (next) => {
    if (isJaegerDatasourceSelector(next)) {
      onChange(
        produce(value, (draft) => {
          draft.datasource = isDefaultJaegerSelector(next) ? undefined : next;
        })
      );
      return;
    }

    throw new Error('Got unexpected non-Jaeger datasource selector');
  };

  const updateField = useCallback(
    (field: FieldKey, nextValue: string | undefined): void => {
      onChange(
        produce(value, (draft) => {
          draft[field] = nextValue;
        })
      );
    },
    [onChange, value]
  );

  return (
    <Stack spacing={2}>
      <FormControl margin="dense" fullWidth={false}>
        <DatasourceSelect
          datasourcePluginKind={JAEGER_DATASOURCE_KIND}
          value={datasourceSelectValue}
          onChange={handleDatasourceChange}
          labelId={datasourceSelectLabelID}
          label="Jaeger Datasource"
          notched
        />
      </FormControl>
      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        <LazyTextField
          label="Trace ID"
          value={value.traceId}
          onCommit={(nextValue) => updateField('traceId', nextValue)}
          sx={{ minWidth: 260 }}
          helperText="Use this for direct trace lookup."
        />
        <LazyAutocompleteTextField
          label="Service"
          value={value.service}
          options={serviceOptions}
          onCommit={(nextValue) => updateField('service', nextValue)}
          sx={{ minWidth: 220 }}
          helperText="Required when Trace ID is empty."
        />
        <LazyAutocompleteTextField
          label="Operation"
          value={value.operation}
          options={operationOptions}
          onCommit={(nextValue) => updateField('operation', nextValue)}
          sx={{ minWidth: 240 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="jaeger-span-kind-label">Span Kind</InputLabel>
          <Select
            labelId="jaeger-span-kind-label"
            label="Span Kind"
            value={value.spanKind ?? ''}
            onChange={(event) =>
              onChange(
                produce(value, (draft) => {
                  draft.spanKind = event.target.value === '' ? undefined : event.target.value;
                })
              )
            }
          >
            {spanKindOptions.map((option) => (
              <MenuItem key={option || 'all'} value={option}>
                {option === '' ? 'Any' : option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="jaeger-limit-label">Limit</InputLabel>
          <Select
            labelId="jaeger-limit-label"
            label="Limit"
            value={value.limit ?? 20}
            onChange={(event) =>
              onChange(
                produce(value, (draft) => {
                  draft.limit =
                    typeof event.target.value === 'number' ? event.target.value : parseInt(event.target.value);
                })
              )
            }
          >
            {limitOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        <LazyTextField
          label="Min Duration"
          value={value.minDuration}
          onCommit={(nextValue) => updateField('minDuration', nextValue)}
          sx={{ minWidth: 180 }}
          placeholder="e.g. 50ms"
        />
        <LazyTextField
          label="Max Duration"
          value={value.maxDuration}
          onCommit={(nextValue) => updateField('maxDuration', nextValue)}
          sx={{ minWidth: 180 }}
          placeholder="e.g. 5s"
        />
      </Stack>
      <LazyTextField
        label="Tags (JSON)"
        value={value.tags}
        onCommit={(nextValue) => updateField('tags', nextValue)}
        placeholder='{"http.status_code":"500"}'
        helperText="Jaeger expects a JSON object encoded as the tags query parameter."
        multiline
        minRows={3}
      />
    </Stack>
  );
}

interface LazyTextFieldProps extends Omit<TextFieldProps, 'value' | 'onChange'> {
  value?: string;
  onCommit: (nextValue: string | undefined) => void;
}

function LazyTextField(props: LazyTextFieldProps): ReactElement {
  const { value, onCommit, ...textFieldProps } = props;
  const [draftValue, setDraftValue] = useState(value ?? '');

  useEffect(() => {
    setDraftValue(value ?? '');
  }, [value]);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    setDraftValue(event.target.value);
  }, []);

  const handleBlur = useCallback((): void => {
    onCommit(toOptionalString(draftValue));
  }, [draftValue, onCommit]);

  return <TextField {...textFieldProps} size="small" value={draftValue} onChange={handleChange} onBlur={handleBlur} />;
}

interface LazyAutocompleteTextFieldProps extends Omit<TextFieldProps, 'value' | 'onChange'> {
  value?: string;
  options: string[];
  onCommit: (nextValue: string | undefined) => void;
}

function LazyAutocompleteTextField(props: LazyAutocompleteTextFieldProps): ReactElement {
  const { value, options, onCommit, ...textFieldProps } = props;
  const [draftValue, setDraftValue] = useState(value ?? '');

  useEffect(() => {
    setDraftValue(value ?? '');
  }, [value]);

  const commitValue = useCallback(
    (nextValue: string): void => {
      const normalizedValue = nextValue;
      setDraftValue(normalizedValue);
      onCommit(toOptionalString(normalizedValue));
    },
    [onCommit]
  );

  const handleInputChange = useCallback((_event: SyntheticEvent, nextValue: string, reason: string): void => {
    if (reason === 'input' || reason === 'clear') {
      setDraftValue(nextValue);
    }
  }, []);

  const handleChange = useCallback(
    (_event: SyntheticEvent, nextValue: string | null): void => {
      commitValue(nextValue ?? '');
    },
    [commitValue]
  );

  const handleBlur = useCallback((): void => {
    onCommit(toOptionalString(draftValue));
  }, [draftValue, onCommit]);

  return (
    <Autocomplete
      freeSolo
      options={options}
      inputValue={draftValue}
      onInputChange={handleInputChange}
      onChange={handleChange}
      renderInput={(params) => <TextField {...params} {...textFieldProps} size="small" onBlur={handleBlur} />}
    />
  );
}

function useServiceOptions(client: JaegerClient | undefined): string[] {
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);

  useEffect(() => {
    let ignore = false;

    if (!client) {
      setServiceOptions([]);
      return;
    }

    client
      .searchServices()
      .then((response) => {
        if (ignore) {
          return;
        }

        setServiceOptions(toSortedUniqueOptions(response.data ?? []));
      })
      .catch(() => {
        if (!ignore) {
          setServiceOptions([]);
        }
      });

    return (): void => {
      ignore = true;
    };
  }, [client]);

  return serviceOptions;
}

function useOperationOptions(client: JaegerClient | undefined, service: string | undefined): string[] {
  const [operationOptions, setOperationOptions] = useState<string[]>([]);
  const normalizedService = useMemo(() => service?.trim(), [service]);

  useEffect(() => {
    let ignore = false;

    if (!client || normalizedService === undefined || normalizedService === '') {
      setOperationOptions([]);
      return;
    }

    client
      .searchOperations(normalizedService)
      .then((response) => {
        if (ignore) {
          return;
        }

        setOperationOptions(toSortedUniqueOptions((response.data ?? []).map((operation) => operation.name)));
      })
      .catch(() => {
        if (!ignore) {
          setOperationOptions([]);
        }
      });

    return (): void => {
      ignore = true;
    };
  }, [client, normalizedService]);

  return operationOptions;
}

function toOptionalString(value: string): string | undefined {
  return value === '' ? undefined : value;
}

function toSortedUniqueOptions(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value !== ''))).sort((a, b) => a.localeCompare(b));
}
