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

import { Box, Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import MinusIcon from 'mdi-material-ui/Minus';
import PlusIcon from 'mdi-material-ui/Plus';
import type { ReactElement } from 'react';

import type { PrometheusExemplarLinkSpec } from './types';

const DEFAULT_TRACE_ID_LABEL = 'trace_id';

export interface ExemplarLinksEditorProps {
  value: PrometheusExemplarLinkSpec[] | undefined;
  onChange: (links: PrometheusExemplarLinkSpec[] | undefined) => void;
  isReadonly?: boolean;
}

/**
 * Editor for the links attached to the exemplars of a Prometheus datasource.
 */
export function ExemplarLinksEditor({ value, onChange, isReadonly }: ExemplarLinksEditorProps): ReactElement {
  const links = value ?? [];

  const updateLink = (index: number, patch: Partial<PrometheusExemplarLinkSpec>): void => {
    onChange(
      links.map((link, i) => {
        if (i !== index) return link;
        const { name, ...updated } = { ...link, ...patch };
        // The name is optional: an empty one is left out of the spec.
        return name ? { name, ...updated } : updated;
      }),
    );
  };

  const addLink = (): void => {
    onChange([...links, { url: '', traceIDLabel: DEFAULT_TRACE_ID_LABEL }]);
  };

  const removeLink = (index: number): void => {
    const remaining = links.filter((_, i) => i !== index);
    onChange(remaining.length > 0 ? remaining : undefined);
  };

  return (
    <Stack spacing={1} mt={1}>
      <Typography variant="subtitle1">Links</Typography>
      <Typography variant="body2" color="textSecondary">
        Links are shown when clicking an exemplar, e.g. to open its trace in a tracing UI. Use{' '}
        <code>{'${traceId}'}</code> in the URL where the trace ID must go: it is replaced with the value of the given
        exemplar label.
      </Typography>
      {links.map((link, index) => (
        <Box
          // oxlint-disable-next-line react/no-array-index-key -- links have no identifier of their own, and every field is controlled by the spec
          key={index}
          component="fieldset"
          aria-label={`Link ${index + 1}`}
          sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, border: 0, margin: 0, padding: 0, minWidth: 0 }}
        >
          <Box display="flex" flexWrap="wrap" gap={2} flexGrow={1}>
            <TextField
              size="small"
              label="Name"
              value={link.name ?? ''}
              placeholder="Optional"
              disabled={isReadonly}
              onChange={(e) => updateLink(index, { name: e.target.value })}
              sx={{ minWidth: 150, flexGrow: 1 }}
            />
            <TextField
              size="small"
              required
              label="Trace ID label"
              value={link.traceIDLabel}
              placeholder={DEFAULT_TRACE_ID_LABEL}
              disabled={isReadonly}
              error={link.traceIDLabel === ''}
              onChange={(e) => updateLink(index, { traceIDLabel: e.target.value })}
              sx={{ minWidth: 150, flexGrow: 1 }}
            />
            <TextField
              size="small"
              required
              fullWidth
              label="URL"
              value={link.url}
              placeholder="https://jaeger.example.com/trace/${traceId}"
              disabled={isReadonly}
              error={link.url === ''}
              onChange={(e) => updateLink(index, { url: e.target.value })}
            />
          </Box>
          {!isReadonly && (
            <IconButton aria-label={`Remove link ${index + 1}`} onClick={() => removeLink(index)}>
              <MinusIcon />
            </IconButton>
          )}
        </Box>
      ))}
      {!isReadonly && (
        <Box>
          <Button variant="outlined" size="small" startIcon={<PlusIcon />} onClick={addLink}>
            Add link
          </Button>
        </Box>
      )}
    </Stack>
  );
}
