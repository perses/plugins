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
import { LokiDatasourceSpec } from './loki-datasource-types';

export interface LokiDatasourceEditorProps {
  value: LokiDatasourceSpec;
  onChange: (next: LokiDatasourceSpec) => void;
  isReadonly?: boolean;
}

export function LokiDatasourceEditor(props: LokiDatasourceEditorProps): ReactElement {
  const { value, onChange, isReadonly } = props;

  const initialSpecDirect: LokiDatasourceSpec = {
    directUrl: '',
  };

  const initialSpecProxy: LokiDatasourceSpec = {
    proxy: {
      kind: 'HTTPProxy',
      spec: {
        allowedEndpoints: [
          {
            endpointPattern: '/loki/api/v1/query',
            method: 'GET',
          },
          {
            endpointPattern: '/loki/api/v1/query_range',
            method: 'GET',
          },
          {
            endpointPattern: '/loki/api/v1/labels',
            method: 'GET',
          },
          {
            endpointPattern: '/loki/api/v1/label/([a-zA-Z0-9_-]+)/values',
            method: 'GET',
          },
          {
            endpointPattern: '/loki/api/v1/series',
            method: 'GET',
          },
          {
            endpointPattern: '/loki/api/v1/index/volume',
            method: 'GET',
          },
          {
            endpointPattern: '/loki/api/v1/index/volume_range',
            method: 'GET',
          },
          {
            endpointPattern: '/loki/api/v1/index/stats',
            method: 'GET',
          },
          {
            endpointPattern: '/loki/api/v1/tail',
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
