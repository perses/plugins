// Copyright 2023 The Perses Authors
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

import { DurationString } from '@perses-dev/core';
import { HTTPSettingsEditor } from '@perses-dev/plugin-system';
import { Box, Button, TextField, Typography, IconButton } from '@mui/material';
import PlusIcon from 'mdi-material-ui/Plus';
import MinusIcon from 'mdi-material-ui/Minus';
import React, { ReactElement } from 'react';
import { DEFAULT_SCRAPE_INTERVAL, PrometheusDatasourceSpec } from './types';

export interface PrometheusDatasourceEditorProps {
  value: PrometheusDatasourceSpec;
  onChange: (next: PrometheusDatasourceSpec) => void;
  isReadonly?: boolean;
}

export function PrometheusDatasourceEditor(props: PrometheusDatasourceEditorProps): ReactElement {
  const { value, onChange, isReadonly } = props;

  const queryParams = value.queryParams ?? {};
  const queryParamEntries = Object.entries(queryParams);

  const handleQueryParamChange = (index: number, field: 'key' | 'value', newValue: string) => {
    const newParams = { ...queryParams };
    const entries = queryParamEntries.slice();
    const entry = entries[index];
    if (!entry) return;

    const [oldKey, oldValue] = entry;

    if (field === 'key') {
      // Remove old key and add new key
      delete newParams[oldKey];
      newParams[newValue] = oldValue;
    } else {
      newParams[oldKey] = newValue;
    }

    onChange({
      ...value,
      queryParams: newParams,
    });
  };

  const addQueryParam = () => {
    const newParams = { ...queryParams };
    newParams[''] = '';

    onChange({
      ...value,
      queryParams: newParams,
    });
  };

  const removeQueryParam = (key: string) => {
    const newParams = { ...queryParams };
    delete newParams[key];

    onChange({
      ...value,
      queryParams: Object.keys(newParams).length > 0 ? newParams : undefined,
    });
  };

  const initialSpecDirect: PrometheusDatasourceSpec = {
    directUrl: '',
  };

  const initialSpecProxy: PrometheusDatasourceSpec = {
    proxy: {
      kind: 'HTTPProxy',
      spec: {
        allowedEndpoints: [
          // list of standard endpoints suggested by default
          {
            endpointPattern: '/api/v1/labels',
            method: 'POST',
          },
          {
            endpointPattern: '/api/v1/series',
            method: 'POST',
          },
          {
            endpointPattern: '/api/v1/metadata',
            method: 'GET',
          },
          {
            endpointPattern: '/api/v1/query',
            method: 'POST',
          },
          {
            endpointPattern: '/api/v1/query_range',
            method: 'POST',
          },
          {
            endpointPattern: '/api/v1/label/([a-zA-Z0-9_-]+)/values',
            method: 'GET',
          },
          {
            endpointPattern: '/api/v1/parse_query',
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
      <Box mb={2}>
        <TextField
          size="small"
          fullWidth
          label="Scrape Interval"
          value={value.scrapeInterval || ''}
          placeholder={`Default: ${DEFAULT_SCRAPE_INTERVAL}`}
          InputProps={{
            readOnly: isReadonly,
          }}
          InputLabelProps={{ shrink: isReadonly ? true : undefined }}
          onChange={(e) => onChange({ ...value, scrapeInterval: e.target.value as DurationString })}
          helperText="Set it to match the typical scrape interval used in your Prometheus instance."
        />
      </Box>
      <HTTPSettingsEditor
        value={value}
        onChange={onChange}
        isReadonly={isReadonly}
        initialSpecDirect={initialSpecDirect}
        initialSpecProxy={initialSpecProxy}
      />
      <Box mt={2}>
        <Typography variant="h5" mb={1}>
          Query Parameters
        </Typography>
        {queryParamEntries.length > 0 && (
          <>
            {queryParamEntries.map(([key, val], index) => (
              <Box key={index} display="flex" alignItems="center" gap={2} mb={1}>
                <TextField
                  size="small"
                  label="Key"
                  value={key}
                  placeholder="Parameter name"
                  disabled={isReadonly}
                  onChange={(e) => handleQueryParamChange(index, 'key', e.target.value)}
                  sx={{ minWidth: 150 }}
                />
                <TextField
                  size="small"
                  label="Value"
                  value={val}
                  placeholder="Parameter value"
                  disabled={isReadonly}
                  onChange={(e) => handleQueryParamChange(index, 'value', e.target.value)}
                  sx={{ minWidth: 150, flexGrow: 1 }}
                />
                {!isReadonly && (
                  <IconButton onClick={() => removeQueryParam(key)}>
                    <MinusIcon />
                  </IconButton>
                )}
              </Box>
            ))}
          </>
        )}
        {!isReadonly && (
          <IconButton onClick={addQueryParam}>
            <PlusIcon />
          </IconButton>
        )}
        {queryParamEntries.length === 0 && (
          <Typography variant="body2" color="textSecondary">
            No query parameters configured. Use query parameters to pass additional options to Prometheus (e.g.,
            dedup=false for Thanos).
          </Typography>
        )}
      </Box>
    </>
  );
}
