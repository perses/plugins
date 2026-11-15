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

import { TextField } from '@mui/material';
import { HTTPSettingsEditor } from '@perses-dev/plugin-system';
import type { ChangeEvent, ReactElement } from 'react';
import { useCallback } from 'react';

import type { TrinoDatasourceSpec } from './trino-datasource-types';

export interface TrinoDatasourceEditorProps {
  value: TrinoDatasourceSpec;
  onChange: (next: TrinoDatasourceSpec) => void;
  isReadonly?: boolean;
}

export function TrinoDatasourceEditor(props: TrinoDatasourceEditorProps): ReactElement {
  const { value, onChange, isReadonly } = props;

  const initialSpecDirect: TrinoDatasourceSpec = {
    directUrl: '',
    userClaim: 'sub',
  };

  const initialSpecProxy: TrinoDatasourceSpec = {
    userClaim: 'sub',
    proxy: {
      kind: 'HTTPProxy',
      spec: {
        allowedEndpoints: [
          {
            endpointPattern: '/v1/statement',
            method: 'POST',
          },
          {
            endpointPattern: '/v1/statement/.*',
            method: 'GET',
          },
        ],
        url: '',
      },
    },
  };

  const handleUserClaimChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...value, userClaim: event.target.value });
    },
    [onChange, value],
  );

  return (
    <>
      <HTTPSettingsEditor
        value={value}
        onChange={onChange}
        isReadonly={isReadonly}
        initialSpecDirect={initialSpecDirect}
        initialSpecProxy={initialSpecProxy}
      />
      <TextField
        fullWidth
        label="JWT claim for Trino user"
        value={value.userClaim ?? 'sub'}
        onChange={handleUserClaimChange}
        helperText="Used to populate X-Trino-User from the configured Authorization bearer JWT. Defaults to sub."
        InputProps={{ readOnly: isReadonly }}
        sx={{ mt: 2 }}
      />
    </>
  );
}
