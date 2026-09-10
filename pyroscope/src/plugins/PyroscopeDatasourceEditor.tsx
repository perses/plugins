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

import { TextField, Typography } from '@mui/material';
import { HTTPSettingsEditor } from '@perses-dev/plugin-system';
import type { DurationString } from '@perses-dev/spec';
import type { ReactElement } from 'react';
import React from 'react';

import type { PyroscopeDatasourceSpec } from './pyroscope-datasource-types';
import { DEFAULT_MIN_STEP } from './pyroscope-datasource-types';

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
            endpointPattern: '/querier.v1.QuerierService/SelectMergeStacktraces',
            method: 'POST',
          },
          {
            endpointPattern: '/querier.v1.QuerierService/SelectSeries',
            method: 'POST',
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
    <>
      <Typography variant="h4" mb={2}>
        General Settings
      </Typography>
      <TextField
        size="small"
        fullWidth
        label="Minimal Step"
        value={value.minStep || ''}
        placeholder={`Default: ${DEFAULT_MIN_STEP}`}
        InputProps={{
          readOnly: isReadonly,
        }}
        InputLabelProps={{ shrink: isReadonly ? true : undefined }}
        onChange={(e) => onChange({ ...value, minStep: e.target.value as DurationString })}
        helperText="Lower bound for the timeline resolution. Set it at or above your Pyroscope ingestion interval to avoid gaps when zooming in."
      />
      <HTTPSettingsEditor
        value={value}
        onChange={onChange}
        isReadonly={isReadonly}
        initialSpecDirect={initialSpecDirect}
        initialSpecProxy={initialSpecProxy}
      />
    </>
  );
}
