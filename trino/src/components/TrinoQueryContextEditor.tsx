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

import { Stack, TextField } from '@mui/material';
import type { ChangeEvent, ReactElement } from 'react';
import { useCallback } from 'react';

export interface TrinoQueryContext {
  catalog?: string;
  schema?: string;
  sessionProperties?: string;
  source?: string;
  routingGroup?: string;
}

interface TrinoQueryContextEditorProps {
  value: TrinoQueryContext;
  onChange: (value: TrinoQueryContext) => void;
  isReadonly?: boolean;
}

export function TrinoQueryContextEditor(props: TrinoQueryContextEditorProps): ReactElement {
  const { value, onChange, isReadonly } = props;

  const handleChange = useCallback(
    (field: keyof TrinoQueryContext) =>
      (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        onChange({ ...value, [field]: event.target.value || undefined });
      },
    [onChange, value],
  );

  return (
    <Stack spacing={1.5}>
      <TextField
        fullWidth
        label="Catalog"
        value={value.catalog ?? ''}
        onChange={handleChange('catalog')}
        InputProps={{ readOnly: isReadonly }}
      />
      <TextField
        fullWidth
        label="Schema"
        value={value.schema ?? ''}
        onChange={handleChange('schema')}
        InputProps={{ readOnly: isReadonly }}
      />
      <TextField
        fullWidth
        label="Source"
        value={value.source ?? ''}
        onChange={handleChange('source')}
        helperText="Sets the X-Trino-Source header for query attribution."
        InputProps={{ readOnly: isReadonly }}
      />
      <TextField
        fullWidth
        label="Routing Group"
        value={value.routingGroup ?? ''}
        onChange={handleChange('routingGroup')}
        helperText="Sets the X-Trino-Routing-Group header."
        InputProps={{ readOnly: isReadonly }}
      />
      <TextField
        fullWidth
        multiline
        minRows={2}
        label="Session properties"
        placeholder="join_distribution_type=AUTOMATIC, query_max_run_time=5m"
        helperText="name=value pairs, separated by commas or line breaks, sent in the X-Trino-Session header."
        value={value.sessionProperties ?? ''}
        onChange={handleChange('sessionProperties')}
        InputProps={{ readOnly: isReadonly }}
      />
    </Stack>
  );
}
