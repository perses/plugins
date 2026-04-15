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
import { GreptimeDBDatasourceSpec } from './greptimedb-datasource-types';

export interface GreptimeDBDatasourceEditorProps {
  value: GreptimeDBDatasourceSpec;
  onChange: (next: GreptimeDBDatasourceSpec) => void;
  isReadonly?: boolean;
}

export function GreptimeDBDatasourceEditor(props: GreptimeDBDatasourceEditorProps): ReactElement {
  const { value, onChange, isReadonly } = props;

  const initialSpecDirect: GreptimeDBDatasourceSpec = {
    directUrl: '',
  };

  const initialSpecProxy: GreptimeDBDatasourceSpec = {
    proxy: {
      kind: 'HTTPProxy',
      spec: {
        allowedEndpoints: [
          {
            endpointPattern: '/v1/sql',
            method: 'POST',
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
