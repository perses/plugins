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

import { FormControl, InputLabel, MenuItem, Select, Stack, TextField } from '@mui/material';
import { useId } from '@perses-dev/components';
import { DatasourceSelect, DatasourceSelectProps } from '@perses-dev/plugin-system';
import { produce } from 'immer';
import { ChangeEvent, ReactElement } from 'react';
import {
  DEFAULT_JAEGER,
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
  const datasourceSelectLabelID = useId('jaeger-datasource-label');

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

  const handleFieldChange =
    (field: FieldKey) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      const nextValue = event.target.value;
      onChange(
        produce(value, (draft) => {
          draft[field] = nextValue === '' ? undefined : nextValue;
        })
      );
    };

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
        <TextField
          size="small"
          label="Trace ID"
          value={value.traceId ?? ''}
          onChange={handleFieldChange('traceId')}
          sx={{ minWidth: 260 }}
          helperText="Use this for direct trace lookup."
        />
        <TextField
          size="small"
          label="Service"
          value={value.service ?? ''}
          onChange={handleFieldChange('service')}
          sx={{ minWidth: 220 }}
          helperText="Required when Trace ID is empty."
        />
        <TextField
          size="small"
          label="Operation"
          value={value.operation ?? ''}
          onChange={handleFieldChange('operation')}
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
        <TextField
          size="small"
          label="Min Duration"
          value={value.minDuration ?? ''}
          onChange={handleFieldChange('minDuration')}
          sx={{ minWidth: 180 }}
          placeholder="e.g. 50ms"
        />
        <TextField
          size="small"
          label="Max Duration"
          value={value.maxDuration ?? ''}
          onChange={handleFieldChange('maxDuration')}
          sx={{ minWidth: 180 }}
          placeholder="e.g. 5s"
        />
      </Stack>
      <TextField
        size="small"
        label="Tags (JSON)"
        value={value.tags ?? ''}
        onChange={handleFieldChange('tags')}
        placeholder='{"http.status_code":"500"}'
        helperText="Jaeger expects a JSON object encoded as the tags query parameter."
        multiline
        minRows={3}
      />
    </Stack>
  );
}
