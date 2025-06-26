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
import React, { ReactElement } from 'react';
import { PyroscopeDatasourceSpec } from './pyroscope-datasource-types';

export interface PyroscopeDatasourceEditorProps {
  value: PyroscopeDatasourceSpec;
  onChange: (next: PyroscopeDatasourceSpec) => void;
  isReadonly?: boolean;
}

export function PyroscopeDatasourceEditor(props: PyroscopeDatasourceEditorProps): ReactElement {
  const { value, onChange, isReadonly } = props;

  const initialSpecDirect: PyroscopeDatasourceSpec = {
    directUrl: '',
  };

  const initialSpecProxy: PyroscopeDatasourceSpec = {
    proxy: {
      kind: 'HTTPProxy',
      spec: {
        allowedEndpoints: [
          // list of standard endpoints suggested by default
          {
            endpointPattern: '/pyroscope/render',
            method: 'GET',
          },
          {
            endpointPattern: '/querier.v1.QuerierService/ProfileTypes',
            method: 'POST',
          },
          {
            endpointPattern: '/querier.v1.QuerierService/LabelNames',
            method: 'POST',
          },
          {
            endpointPattern: '/querier.v1.QuerierService/LabelValues',
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
