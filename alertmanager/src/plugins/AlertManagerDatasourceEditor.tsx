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

import { HTTPSettingsEditor } from '@perses-dev/plugin-system';
import { ReactElement } from 'react';
import { AlertManagerDatasourceSpec } from './types';

export interface AlertManagerDatasourceEditorProps {
  value: AlertManagerDatasourceSpec;
  onChange: (next: AlertManagerDatasourceSpec) => void;
  isReadonly?: boolean;
}

export function AlertManagerDatasourceEditor(props: AlertManagerDatasourceEditorProps): ReactElement {
  const { value, onChange, isReadonly } = props;

  const initialSpecDirect: AlertManagerDatasourceSpec = {
    directUrl: '',
  };

  const initialSpecProxy: AlertManagerDatasourceSpec = {
    proxy: {
      kind: 'HTTPProxy',
      spec: {
        allowedEndpoints: [
          {
            endpointPattern: '/api/v2/alerts',
            method: 'GET',
          },
          {
            endpointPattern: '/api/v2/silences',
            method: 'GET',
          },
          {
            endpointPattern: '/api/v2/silences',
            method: 'POST',
          },
          {
            endpointPattern: '/api/v2/silence/.*',
            method: 'GET',
          },
          {
            endpointPattern: '/api/v2/silence/.*',
            method: 'DELETE',
          },
          {
            endpointPattern: '/api/v2/status',
            method: 'GET',
          },
        ],
        url: '',
      },
    },
  };

  return (
    <HTTPSettingsEditor
      value={value}
      onChange={onChange}
      isReadonly={isReadonly}
      initialSpecDirect={initialSpecDirect}
      initialSpecProxy={initialSpecProxy}
    />
  );
}
