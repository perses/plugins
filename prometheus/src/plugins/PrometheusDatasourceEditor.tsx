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
import React, { ReactElement, useState } from 'react';
import { DEFAULT_SCRAPE_INTERVAL, PrometheusDatasourceSpec } from './types';

interface QueryParamEntry {
  key: string;
  value: string;
}

export interface PrometheusDatasourceEditorProps {
  value: PrometheusDatasourceSpec;
  onChange: (next: PrometheusDatasourceSpec) => void;
  isReadonly?: boolean;
}

export function PrometheusDatasourceEditor(props: PrometheusDatasourceEditorProps): ReactElement {
  const { value, onChange, isReadonly } = props;

  // Use local state to maintain an array of entries during editing, instead of
  // manipulating a map directly which causes weird UX.
  const [entries, setEntries] = useState<QueryParamEntry[]>(() => {
    const queryParams = value.queryParams ?? {};
    return Object.entries(queryParams).map(([key, value]) => ({ key, value }));
  });

  // Check for duplicate keys
  const keyMap = new Map<string, number>();
  const duplicateKeys = new Set<string>();
  entries.forEach(({ key }) => {
    if (key !== '') {
      const count = (keyMap.get(key) || 0) + 1;
      keyMap.set(key, count);
      if (count > 1) {
        duplicateKeys.add(key);
      }
    }
  });
  const hasDuplicates = duplicateKeys.size > 0;

  // Convert entries array to object and trigger onChange
  const syncToParent = (newEntries: QueryParamEntry[]) => {
    const newParams: Record<string, string> = {};
    newEntries.forEach(({ key, value }) => {
      if (key !== '' || value !== '') {
        newParams[key] = value;
      }
    });

    onChange({
      ...value,
      queryParams: Object.keys(newParams).length > 0 ? newParams : undefined,
    });
  };

  const handleQueryParamChange = (index: number, field: 'key' | 'value', newValue: string) => {
    const newEntries = entries.slice();
    const entry = newEntries[index];
    if (!entry) return;

    if (field === 'key') {
      newEntries[index] = { key: newValue, value: entry.value };
    } else {
      newEntries[index] = { key: entry.key, value: newValue };
    }
    setEntries(newEntries);
    syncToParent(newEntries);
  };

  const addQueryParam = () => {
    const newEntries = [...entries, { key: '', value: '' }];
    setEntries(newEntries);
    syncToParent(newEntries);
  };

  const removeQueryParam = (index: number) => {
    const newEntries = entries.slice();
    newEntries.splice(index, 1);
    setEntries(newEntries);
    syncToParent(newEntries);
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
        {entries.length > 0 && (
          <>
            {entries.map((entry, index) => (
              <Box key={index} display="flex" alignItems="center" gap={2} mb={1}>
                <TextField
                  size="small"
                  label="Key"
                  value={entry.key}
                  placeholder="Parameter name"
                  disabled={isReadonly}
                  onChange={(e) => handleQueryParamChange(index, 'key', e.target.value)}
                  error={entry.key !== '' && duplicateKeys.has(entry.key)}
                  sx={{ minWidth: 150 }}
                />
                <TextField
                  size="small"
                  label="Value"
                  value={entry.value}
                  placeholder="Parameter value"
                  disabled={isReadonly}
                  onChange={(e) => handleQueryParamChange(index, 'value', e.target.value)}
                  sx={{ minWidth: 150, flexGrow: 1 }}
                />
                {!isReadonly && (
                  <IconButton onClick={() => removeQueryParam(index)}>
                    <MinusIcon />
                  </IconButton>
                )}
              </Box>
            ))}
          </>
        )}
        {hasDuplicates && (
          <Typography variant="body2" color="error" mb={1}>
            Duplicate parameter keys detected. Each key must be unique.
          </Typography>
        )}
        {!isReadonly && (
          <IconButton onClick={addQueryParam}>
            <PlusIcon />
          </IconButton>
        )}
        {entries.length === 0 && (
          <Typography variant="body2" color="textSecondary">
            No query parameters configured. Use query parameters to pass additional options to Prometheus (e.g.,
            dedup=false for Thanos).
          </Typography>
        )}
      </Box>
    </>
  );
}
