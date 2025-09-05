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
import { ReactElement, useCallback, useState } from 'react';
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

/* TODO: 
Open Question for later improvement
The usage of direct onchange here causes an immediate spec update which eventually updates the panel
This was probably intentional to allow for quick switching between values.
Shouldn't we update the panel only through the Run Query Button? 
I think we should only track the changes and let the button to Run the query
*/

export function PrometheusLabelValuesVariableEditor(
  props: OptionsEditorProps<PrometheusLabelValuesVariableOptions>
): ReactElement {
  const {
    onChange,
    value,
    value: { datasource },
    queryHandlerSettings,
  } = props;
  const selectedDatasource = datasource ?? DEFAULT_PROM;
  const [labelValue, setLabelValue] = useState(props.value.labelName);
  const [matchersValues, setMatchersValues] = useState(props.value.matchers ?? []);
  const handleDatasourceChange: DatasourceSelectProps['onChange'] = useCallback(
    (next) => {
      if (isPrometheusDatasourceSelector(next)) {
        onChange(
          produce(value, (draft) => {
            // If they're using the default, just omit the datasource prop (i.e. set to undefined)
            draft.datasource = isDefaultPromSelector(next) ? undefined : next;
          })
        );
        if (queryHandlerSettings?.setWatchOtherSpecs)
          queryHandlerSettings.setWatchOtherSpecs({ ...value, datasource: next });
        return;
      }

      throw new Error('Got unexpected non-Prometheus datasource selector');
    },
    [onChange, queryHandlerSettings, value]
  );

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setLabelValue(e.target.value);
      if (queryHandlerSettings?.setWatchOtherSpecs)
        queryHandlerSettings.setWatchOtherSpecs({ ...value, labelName: e.target.value });
    },
    [value, queryHandlerSettings]
  );

  const handleMatchEditorsChange = useCallback(
    (e: string[]) => {
      setMatchersValues(e);
      if (queryHandlerSettings?.setWatchOtherSpecs) queryHandlerSettings.setWatchOtherSpecs({ ...value, matchers: e });
    },
    [value, queryHandlerSettings]
  );

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
        value={labelValue}
        onChange={handleLabelChange}
        InputProps={{
          readOnly: props.isReadonly,
        }}
      />
      <MatcherEditor matchers={matchersValues} onChange={handleMatchEditorsChange} isReadonly={props.isReadonly} />
    </Stack>
  );
}

export function PrometheusLabelNamesVariableEditor(
  props: OptionsEditorProps<PrometheusLabelNamesVariableOptions>
): ReactElement {
  const {
    onChange,
    value,
    value: { datasource },
    queryHandlerSettings,
  } = props;

  const selectedDatasource = datasource ?? DEFAULT_PROM;
  const [matchersValues, setMatchersValues] = useState(props.value.matchers ?? []);
  const handleDatasourceChange: DatasourceSelectProps['onChange'] = useCallback(
    (next) => {
      if (isPrometheusDatasourceSelector(next)) {
        onChange(
          produce(value, (draft) => {
            // If they're using the default, just omit the datasource prop (i.e. set to undefined)
            draft.datasource = isDefaultPromSelector(next) ? undefined : next;
          })
        );
        if (queryHandlerSettings?.setWatchOtherSpecs)
          queryHandlerSettings.setWatchOtherSpecs({ ...value, datasource: next });
        return;
      }

      throw new Error('Got unexpected non-Prometheus datasource selector');
    },
    [onChange, queryHandlerSettings, value]
  );

  const handleMatchEditorChange = useCallback(
    (e: string[]) => {
      setMatchersValues(e);
      if (queryHandlerSettings?.setWatchOtherSpecs) {
        queryHandlerSettings.setWatchOtherSpecs({ ...value, matchers: e });
      }
    },
    [value, queryHandlerSettings]
  );

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
      <MatcherEditor matchers={matchersValues} isReadonly={props.isReadonly} onChange={handleMatchEditorChange} />
    </Stack>
  );
}

export function PrometheusPromQLVariableEditor(
  props: OptionsEditorProps<PrometheusPromQLVariableOptions>
): ReactElement {
  const {
    onChange,
    value,
    value: { datasource },
    queryHandlerSettings,
  } = props;
  const selectedDatasource = datasource ?? DEFAULT_PROM;

  const { data: client } = useDatasourceClient<PrometheusClient>(selectedDatasource);
  const promURL = client?.options.datasourceUrl;
  const [labelValue, setLableValue] = useState(props.value.labelName);
  const handleDatasourceChange: DatasourceSelectProps['onChange'] = useCallback(
    (next) => {
      if (isPrometheusDatasourceSelector(next)) {
        onChange(
          produce(value, (draft) => {
            // If they're using the default, just omit the datasource prop (i.e. set to undefined)
            draft.datasource = isDefaultPromSelector(next) ? undefined : next;
          })
        );
        if (queryHandlerSettings?.setWatchOtherSpecs)
          queryHandlerSettings?.setWatchOtherSpecs({ ...value, datasource: next });
        return;
      }

      throw new Error('Got unexpected non-Prometheus datasource selector');
    },
    [value, onChange, queryHandlerSettings]
  );

  const handleOnBlurPromQlChange = useCallback(
    (e: React.FocusEvent<HTMLDivElement, Element>) => {
      onChange({ ...value, expr: e.target.textContent ?? '' });
    },
    [onChange, value]
  );

  const trackPromQlChanges = useCallback(
    (e: React.FocusEvent<HTMLDivElement, Element>) => {
      if (queryHandlerSettings?.setWatchOtherSpecs)
        queryHandlerSettings?.setWatchOtherSpecs({ ...value, expr: e.target.textContent ?? '' });
    },
    [queryHandlerSettings, value]
  );

  const handleLabelNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setLableValue(e.target.value);
      if (queryHandlerSettings?.setWatchOtherSpecs)
        queryHandlerSettings?.setWatchOtherSpecs({ ...value, labelName: e.target.value });
    },
    [queryHandlerSettings, value]
  );

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
        onBlur={queryHandlerSettings?.runWithOnBlur ? handleOnBlurPromQlChange : trackPromQlChanges}
        readOnly={props.isReadonly}
        width="100%"
      />
      <TextField
        label="Label Name"
        required
        value={labelValue}
        InputProps={{
          readOnly: props.isReadonly,
        }}
        onChange={handleLabelNameChange}
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
