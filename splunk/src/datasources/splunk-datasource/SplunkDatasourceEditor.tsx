// Copyright 2025 The Perses Authors
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
import { SplunkDatasourceSpec } from './splunk-datasource-types';

export interface SplunkDatasourceEditorProps {
  value: SplunkDatasourceSpec;
  onChange: (next: SplunkDatasourceSpec) => void;
  isReadonly?: boolean;
}

export function SplunkDatasourceEditor(props: SplunkDatasourceEditorProps): ReactElement {
  const { value, onChange, isReadonly } = props;

  const initialSpecDirect: SplunkDatasourceSpec = {
    directUrl: '',
  };

  const initialSpecProxy: SplunkDatasourceSpec = {
    proxy: {
      kind: 'HTTPProxy',
      spec: {
        allowedEndpoints: [
          {
            endpointPattern: '/services/search/v2/jobs',
            method: 'POST',
          },
          {
            endpointPattern: '/services/search/v2/jobs/([a-zA-Z0-9_.-]+)',
            method: 'GET',
          },
          {
            endpointPattern: '/services/search/v2/jobs/([a-zA-Z0-9_.-]+)/results',
            method: 'GET',
          },
          {
            endpointPattern: '/services/search/v2/jobs/([a-zA-Z0-9_.-]+)/events',
            method: 'GET',
          },
          {
            endpointPattern: '/services/search/v2/jobs/export',
            method: 'POST',
          },
          {
            endpointPattern: '/services/data/indexes',
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
