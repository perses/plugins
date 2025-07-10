// Copyright 2024 The Perses Authors
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
import { FormControl, Stack, TextField } from '@mui/material';
import {
  DatasourceSelect,
  DatasourceSelectProps,
  OptionsEditorProps,
  useDatasourceClient,
  VariableOption,
} from '@perses-dev/plugin-system';
import { produce } from 'immer';
import { ReactElement } from 'react';
import { PromQLEditor } from '../components';
import {
  DEFAULT_PROM,
  isDefaultPromSelector,
  isPrometheusDatasourceSelector,
  MatrixData,
  PROM_DATASOURCE_KIND,
  PrometheusClient,
  VectorData,
} from '../model';
import { MatcherEditor } from './MatcherEditor';
import {
  PrometheusLabelNamesVariableOptions,
  PrometheusLabelValuesVariableOptions,
  PrometheusPromQLVariableOptions,
} from './types';

export function PrometheusLabelValuesVariableEditor(
  props: OptionsEditorProps<PrometheusLabelValuesVariableOptions>
): ReactElement {
  const { onChange, value } = props;
  const { datasource } = value;
  const selectedDatasource = datasource ?? DEFAULT_PROM;

  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (next) => {
    if (isPrometheusDatasourceSelector(next)) {
      onChange(
        produce(value, (draft) => {
          // If they're using the default, just omit the datasource prop (i.e. set to undefined)
          draft.datasource = isDefaultPromSelector(next) ? undefined : next;
        })
      );
      return;
    }

    throw new Error('Got unexpected non-Prometheus datasource selector');
  };

  return (
    <Stack spacing={2}>
      <FormControl margin="dense">
        <DatasourceSelect
          datasourcePluginKind="PrometheusDatasource"
          value={selectedDatasource}
          onChange={handleDatasourceChange}
          readOnly={props.isReadonly}
          labelId="prom-datasource-label"
          label="Prometheus Datasource"
        />
      </FormControl>
      <TextField
        label="Label Name"
        required
        value={props.value.labelName}
        onChange={(e) => {
          props.onChange({ ...props.value, labelName: e.target.value });
        }}
        InputProps={{
          readOnly: props.isReadonly,
        }}
      />
      <MatcherEditor
        matchers={props.value.matchers ?? []}
        onChange={(e) => {
          props.onChange({ ...props.value, matchers: e });
        }}
        isReadonly={props.isReadonly}
      />
    </Stack>
  );
}

export function PrometheusLabelNamesVariableEditor(
  props: OptionsEditorProps<PrometheusLabelNamesVariableOptions>
): ReactElement {
  const { onChange, value } = props;
  const { datasource } = value;
  const selectedDatasource = datasource ?? DEFAULT_PROM;

  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (next) => {
    if (isPrometheusDatasourceSelector(next)) {
      onChange(
        produce(value, (draft) => {
          // If they're using the default, just omit the datasource prop (i.e. set to undefined)
          draft.datasource = isDefaultPromSelector(next) ? undefined : next;
        })
      );
      return;
    }

    throw new Error('Got unexpected non-Prometheus datasource selector');
  };

  return (
    <Stack spacing={2}>
      <FormControl margin="dense">
        <DatasourceSelect
          datasourcePluginKind="PrometheusDatasource"
          value={selectedDatasource}
          onChange={handleDatasourceChange}
          disabled={props.isReadonly}
          labelId="prom-datasource-label"
          label="Prometheus Datasource"
        />
      </FormControl>
      <MatcherEditor
        matchers={props.value.matchers ?? []}
        isReadonly={props.isReadonly}
        onChange={(e) => {
          props.onChange({ ...props.value, matchers: e });
        }}
      />
    </Stack>
  );
}

export function PrometheusPromQLVariableEditor(
  props: OptionsEditorProps<PrometheusPromQLVariableOptions>
): ReactElement {
  const { onChange, value } = props;
  const { datasource } = value;
  const selectedDatasource = datasource ?? DEFAULT_PROM;

  const { data: client } = useDatasourceClient<PrometheusClient>(selectedDatasource);
  const promURL = client?.options.datasourceUrl;

  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (next) => {
    if (isPrometheusDatasourceSelector(next)) {
      onChange(
        produce(value, (draft) => {
          // If they're using the default, just omit the datasource prop (i.e. set to undefined)
          draft.datasource = isDefaultPromSelector(next) ? undefined : next;
        })
      );
      return;
    }

    throw new Error('Got unexpected non-Prometheus datasource selector');
  };

  return (
    <Stack spacing={2}>
      <FormControl margin="dense">
        <DatasourceSelect
          datasourcePluginKind={PROM_DATASOURCE_KIND}
          value={selectedDatasource}
          onChange={handleDatasourceChange}
          labelId="prom-datasource-label"
          label="Prometheus Datasource"
          disabled={props.isReadonly}
        />
      </FormControl>
      <PromQLEditor
        completeConfig={{ remote: { url: promURL } }}
        value={value.expr}
        datasource={selectedDatasource}
        onBlur={(event) => {
          props.onChange({ ...props.value, expr: event.target.textContent ?? '' });
        }}
        readOnly={props.isReadonly}
        width="100%"
      />
      <TextField
        label="Label Name"
        value={props.value.labelName}
        InputProps={{
          readOnly: props.isReadonly,
        }}
        onChange={(e) => {
          props.onChange({ ...props.value, labelName: e.target.value });
        }}
      />
    </Stack>
  );
}

export function capturingMatrix(matrix: MatrixData, labelName: string): string[] {
  const captured = new Set<string>();
  for (const sample of matrix.result) {
    const value = sample.metric[labelName];
    if (value !== undefined) {
      captured.add(value);
    }
  }
  return Array.from(captured.values());
}

export function capturingVector(vector: VectorData, labelName: string): string[] {
  const captured = new Set<string>();
  for (const sample of vector.result) {
    const value = sample.metric[labelName];
    if (value !== undefined) {
      captured.add(value);
    }
  }
  return Array.from(captured.values());
}

/**
 * Takes a list of strings and returns a list of VariableOptions
 */
export const stringArrayToVariableOptions = (values?: string[]): VariableOption[] => {
  if (!values) return [];
  return values.map((value) => ({
    value,
    label: value,
  }));
};
