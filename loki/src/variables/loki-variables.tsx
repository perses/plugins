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

import { FormControl, Stack, TextField } from '@mui/material';
import {
  DatasourceSelect,
  DatasourceSelectProps,
  isVariableDatasource,
  OptionsEditorProps,
  useDatasourceClient,
  useDatasourceSelectValueToSelector,
  VariableOption,
} from '@perses-dev/plugin-system';
import { produce } from 'immer';
import { ReactElement, useCallback, ChangeEvent, FocusEvent } from 'react';
import { LogQLEditor } from '../components';
import {
  DEFAULT_LOKI,
  isDefaultLokiSelector,
  isLokiDatasourceSelector,
  LOKI_DATASOURCE_KIND,
  LokiDatasourceSelector,
  LokiClient,
  LokiStreamResult,
} from '../model';
import { MatcherEditor } from './MatcherEditor';
import {
  LokiLabelNamesVariableOptions,
  LokiLabelValuesVariableOptions,
  LokiLogQLVariableOptions,
  LokiVariableOptionsBase,
} from './types';

const EMPTY_MATCHERS: string[] = [];

function useLokiDatasourceChangeHandler<T extends LokiVariableOptionsBase>(
  value: T,
  onChange: (value: T) => void
): DatasourceSelectProps['onChange'] {
  return useCallback(
    (next) => {
      if (isVariableDatasource(next) || isLokiDatasourceSelector(next)) {
        // If they're using the default, just omit the datasource prop
        onChange(
          produce(value, (draft) => {
            draft.datasource = !isVariableDatasource(next) && isDefaultLokiSelector(next) ? undefined : next;
          })
        );
        return;
      }
      throw new Error('Got unexpected non-Loki datasource selector');
    },
    [onChange, value]
  );
}

export function LokiLabelValuesVariableEditor(props: OptionsEditorProps<LokiLabelValuesVariableOptions>): ReactElement {
  const {
    onChange,
    value,
    value: { datasource },
  } = props;
  const selectedDatasource = datasource ?? DEFAULT_LOKI;

  const handleDatasourceChange = useLokiDatasourceChangeHandler(value, onChange);

  const handleLabelChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(
        produce(value, (draft) => {
          draft.labelName = e.target.value;
        })
      );
    },
    [onChange, value]
  );

  const handleMatchEditorsChange = useCallback(
    (matchers: string[]) => {
      onChange(
        produce(value, (draft) => {
          draft.matchers = matchers;
        })
      );
    },
    [onChange, value]
  );

  return (
    <Stack spacing={2}>
      <FormControl margin="dense">
        <DatasourceSelect
          datasourcePluginKind={LOKI_DATASOURCE_KIND}
          value={selectedDatasource}
          onChange={handleDatasourceChange}
          disabled={props.isReadonly}
          labelId="loki-datasource-label"
          label="Loki Datasource"
        />
      </FormControl>
      <TextField
        label="Label Name"
        required
        value={props.value.labelName}
        onChange={handleLabelChange}
        slotProps={{
          input: {
            readOnly: props.isReadonly,
          },
        }}
      />
      <MatcherEditor
        matchers={props.value.matchers ?? EMPTY_MATCHERS}
        onChange={handleMatchEditorsChange}
        isReadonly={props.isReadonly}
      />
    </Stack>
  );
}

export function LokiLabelNamesVariableEditor(props: OptionsEditorProps<LokiLabelNamesVariableOptions>): ReactElement {
  const {
    onChange,
    value,
    value: { datasource },
  } = props;

  const selectedDatasource = datasource ?? DEFAULT_LOKI;
  const handleDatasourceChange = useLokiDatasourceChangeHandler(value, onChange);

  const handleMatchEditorChange = useCallback(
    (matchers: string[]) => {
      onChange(
        produce(value, (draft) => {
          draft.matchers = matchers;
        })
      );
    },
    [onChange, value]
  );

  return (
    <Stack spacing={2}>
      <FormControl margin="dense">
        <DatasourceSelect
          datasourcePluginKind={LOKI_DATASOURCE_KIND}
          value={selectedDatasource}
          onChange={handleDatasourceChange}
          disabled={props.isReadonly}
          labelId="loki-datasource-label"
          label="Loki Datasource"
        />
      </FormControl>
      <MatcherEditor
        matchers={props.value.matchers ?? EMPTY_MATCHERS}
        isReadonly={props.isReadonly}
        onChange={handleMatchEditorChange}
      />
    </Stack>
  );
}

export function LokiLogQLVariableEditor(props: OptionsEditorProps<LokiLogQLVariableOptions>): ReactElement {
  const {
    onChange,
    value,
    value: { datasource },
  } = props;
  const datasourceSelectValue = datasource ?? DEFAULT_LOKI;
  const selectedDatasource = useDatasourceSelectValueToSelector(
    datasourceSelectValue,
    LOKI_DATASOURCE_KIND
  ) as LokiDatasourceSelector;

  const { data: client } = useDatasourceClient<LokiClient>(selectedDatasource);

  const handleDatasourceChange = useLokiDatasourceChangeHandler(value, onChange);

  const handleOnBlurLogQLChange = useCallback(
    (e: FocusEvent<HTMLDivElement>) => {
      onChange(
        produce(value, (draft) => {
          draft.expr = e.target.textContent ?? '';
        })
      );
    },
    [onChange, value]
  );

  const handleLabelNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(
        produce(value, (draft) => {
          draft.labelName = e.target.value;
        })
      );
    },
    [onChange, value]
  );

  return (
    <Stack spacing={2}>
      <FormControl margin="dense">
        <DatasourceSelect
          datasourcePluginKind={LOKI_DATASOURCE_KIND}
          value={datasourceSelectValue}
          onChange={handleDatasourceChange}
          labelId="loki-datasource-label"
          label="Loki Datasource"
          disabled={props.isReadonly}
        />
      </FormControl>
      <LogQLEditor
        completionConfig={client ? { client } : undefined}
        value={value.expr}
        onBlur={handleOnBlurLogQLChange}
        readOnly={props.isReadonly}
        width="100%"
      />
      <TextField
        label="Label Name"
        required
        value={props.value.labelName}
        slotProps={{
          input: {
            readOnly: props.isReadonly,
          },
        }}
        onChange={handleLabelNameChange}
      />
    </Stack>
  );
}

export function capturingMetric(results: Array<{ metric: Record<string, string> }>, labelName: string): string[] {
  const captured = new Set<string>();
  for (const sample of results) {
    const value = sample.metric[labelName];
    if (value !== undefined) {
      captured.add(value);
    }
  }
  return Array.from(captured);
}

export function capturingStreams(results: LokiStreamResult[], labelName: string): string[] {
  const captured = new Set<string>();
  for (const sample of results) {
    const value = sample.stream[labelName];
    if (value !== undefined) {
      captured.add(value);
    }
  }
  return Array.from(captured);
}

export const stringArrayToVariableOptions = (values?: string[]): VariableOption[] => {
  if (!values) return [];
  return values.map((value) => ({
    value,
    label: value,
  }));
};
