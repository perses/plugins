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
import type { DatasourceEditorProps } from '@perses-dev/plugin-system';
import { HTTPSettingsEditor } from '@perses-dev/plugin-system';
import type { ReactElement } from 'react';

import type { TrinoDatasourceSpec } from './trino-datasource-types';

export type TrinoDatasourceEditorProps = DatasourceEditorProps<TrinoDatasourceSpec>;

/** TRINO_PROXY_HEADERS lists the request headers the plugin sends, for the proxy allowHeaders default. */
export const TRINO_PROXY_HEADERS = [
  'Content-Type',
  'X-Trino-User',
  'X-Trino-Catalog',
  'X-Trino-Schema',
  'X-Trino-Session',
  'X-Trino-Source',
  'X-Trino-Time-Zone',
  'X-Trino-Routing-Group',
  'X-Trino-Client-Capabilities',
];

const initialSpecDirect: TrinoDatasourceSpec = {
  directUrl: '',
};

const initialSpecProxy: TrinoDatasourceSpec = {
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
        {
          endpointPattern: '/v1/statement/.*',
          method: 'DELETE',
        },
        {
          endpointPattern: '/v1/info',
          method: 'GET',
        },
      ],
      // Trino answers 406 to any X-Forwarded-* header unless http-server.process-forwarded is enabled, and a reverse
      // proxy in front of Perses may add several of them. Only forward the headers this plugin uses.
      allowHeaders: TRINO_PROXY_HEADERS,
      url: '',
    },
  },
};

export function TrinoDatasourceEditor(props: TrinoDatasourceEditorProps): ReactElement {
  const { value, onChange, isReadonly, testConnection } = props;

  return (
    <HTTPSettingsEditor
      value={value}
      onChange={onChange}
      isReadonly={isReadonly}
      testConnection={testConnection}
      initialSpecDirect={initialSpecDirect}
      initialSpecProxy={initialSpecProxy}
    />
  );
}
