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

import { Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { generateQueryNames, useDataQueriesContext } from '@perses-dev/plugin-system';
import type { ReactElement } from 'react';
import React, { useCallback, useMemo } from 'react';

import type { EdgeSpec, NodeSpec } from '../../model';
import { ANCHOR_KEYS, ANCHOR_LABELS } from '../../utils/edgeUtils';
import { parseNumberInput } from '../../utils/inputUtils';
import { NumberField } from '../shared/NumberField';
import { SelectField } from '../shared/SelectField';

const ANCHOR_OPTIONS = ANCHOR_KEYS.map((key) => ({ value: key, label: ANCHOR_LABELS[key] }));

interface EdgePropertiesPanelProps {
  edge: EdgeSpec;
  nodes: NodeSpec[];
  onChange: (updated: EdgeSpec) => void;
}

export function EdgePropertiesPanel({ edge, nodes, onChange }: EdgePropertiesPanelProps): ReactElement {
  const hasFreeTarget = !edge.target;
  const { queryDefinitions } = useDataQueriesContext();
  const queryCount = queryDefinitions.length;
  const queryNames = useMemo(() => generateQueryNames(queryDefinitions), [queryDefinitions]);
  const queryIndexes = useMemo(() => Array.from({ length: queryCount }, (_, i) => i), [queryCount]);

  const onEdgeSpecChange = useCallback(
    (key: keyof EdgeSpec, map: (e: React.ChangeEvent<HTMLInputElement>, edge: EdgeSpec) => EdgeSpec[typeof key]) =>
      (e: React.ChangeEvent<HTMLInputElement>): void => {
        onChange({ ...edge, [key]: map(e, edge) });
      },
    [edge, onChange],
  );

  const onFieldChange = useCallback(
    (key: keyof EdgeSpec, emptyAsUndefined = false) =>
      onEdgeSpecChange(key, (e) => (emptyAsUndefined ? e.target.value || undefined : e.target.value)),
    [onEdgeSpecChange],
  );

  const onNumberFieldChange = useCallback(
    (
      key: keyof Pick<EdgeSpec, 'strokeWidth' | 'sourceQueryIndex' | 'targetQueryIndex'>,
      opts: { min?: number; optional?: boolean } = {},
    ) => onEdgeSpecChange(key, (e, n) => parseNumberInput(e.target.value, n[key], opts)),
    [onEdgeSpecChange],
  );

  const onTargetChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      onChange({
        ...edge,
        target: e.target.value || undefined,
        targetAnchor: e.target.value ? (edge.targetAnchor ?? 'n') : undefined,
        freeEndpoint: e.target.value ? undefined : edge.freeEndpoint,
      });
    },
    [edge, onChange],
  );

  const onBidirectionalChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...edge, bidirectional: e.target.checked || undefined });
    },
    [edge, onChange],
  );

  const bidirectionalCheckbox = useMemo(
    () => <Checkbox size="small" checked={edge.bidirectional ?? false} onChange={onBidirectionalChange} />,
    [edge.bidirectional, onBidirectionalChange],
  );

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">Edge properties</Typography>

      <TextField
        label="Name"
        size="small"
        value={edge.name ?? ''}
        placeholder={edge.id}
        onChange={onFieldChange('name', true)}
      />

      <SelectField label="Source" value={edge.source} onChange={onFieldChange('source')}>
        {nodes.map((n) => (
          <MenuItem key={n.id} value={n.id}>
            {n.label ?? n.id}
          </MenuItem>
        ))}
      </SelectField>

      <SelectField label="Source anchor" value={edge.sourceAnchor ?? 'n'} onChange={onFieldChange('sourceAnchor')}>
        {ANCHOR_OPTIONS.map((a) => (
          <MenuItem key={a.value} value={a.value}>
            {a.label}
          </MenuItem>
        ))}
      </SelectField>

      <SelectField label="Target" value={edge.target ?? ''} onChange={onTargetChange}>
        <MenuItem value="">
          <em>Free endpoint</em>
        </MenuItem>
        {nodes.map((n) => (
          <MenuItem key={n.id} value={n.id}>
            {n.label ?? n.id}
          </MenuItem>
        ))}
      </SelectField>

      <SelectField
        label="Target anchor"
        value={edge.targetAnchor ?? 'n'}
        disabled={hasFreeTarget}
        onChange={onFieldChange('targetAnchor')}
      >
        {ANCHOR_OPTIONS.map((a) => (
          <MenuItem key={a.value} value={a.value}>
            {a.label}
          </MenuItem>
        ))}
      </SelectField>

      <FormControlLabel control={bidirectionalCheckbox} label="Bidirectional" />

      <SelectField
        label="Thickness mode"
        value={edge.thicknessMode ?? 'fixed'}
        onChange={onFieldChange('thicknessMode')}
      >
        <MenuItem value="fixed">Fixed</MenuItem>
        <MenuItem value="threshold">Threshold</MenuItem>
      </SelectField>

      {(edge.thicknessMode ?? 'fixed') === 'fixed' ? (
        <NumberField
          label="Stroke width"
          min={1}
          value={edge.strokeWidth ?? ''}
          placeholder="default"
          onChange={onNumberFieldChange('strokeWidth', { min: 1, optional: true })}
          sx={{ width: 'auto' }}
        />
      ) : null}

      <SelectField
        label="Source → target query"
        value={edge.sourceQueryIndex ?? ''}
        onChange={onNumberFieldChange('sourceQueryIndex', { min: 0, optional: true })}
      >
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        {queryIndexes.map((qi) => (
          <MenuItem key={qi} value={qi}>
            {queryNames[qi] ?? `#${qi + 1}`}
          </MenuItem>
        ))}
      </SelectField>

      <TextField
        label="Source label template"
        size="small"
        value={edge.sourceLabelTemplate ?? ''}
        onChange={onFieldChange('sourceLabelTemplate', true)}
        helperText="Use {{value}} to show query result"
      />

      {edge.bidirectional ? (
        <>
          <SelectField
            label="Target → source query"
            value={edge.targetQueryIndex ?? ''}
            onChange={onNumberFieldChange('targetQueryIndex', { min: 0, optional: true })}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {queryIndexes.map((qi) => (
              <MenuItem key={qi} value={qi}>
                {queryNames[qi] ?? `#${qi + 1}`}
              </MenuItem>
            ))}
          </SelectField>

          <TextField
            label="Target label template"
            size="small"
            value={edge.targetLabelTemplate ?? ''}
            onChange={onFieldChange('targetLabelTemplate', true)}
            helperText="Use {{value}} to show query result"
          />
        </>
      ) : null}
    </Stack>
  );
}
