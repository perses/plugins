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

import type { AnchorPoint, EdgeSpec, NodeSpec, ThicknessMode } from '../../model';
import { ANCHOR_LABELS, ANCHOR_KEYS } from '../../utils/edgeUtils';
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

  const onNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...edge, name: e.target.value || undefined });
    },
    [edge, onChange],
  );

  const onSourceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...edge, source: e.target.value });
    },
    [edge, onChange],
  );

  const onSourceAnchorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...edge, sourceAnchor: e.target.value as AnchorPoint });
    },
    [edge, onChange],
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

  const onTargetAnchorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...edge, targetAnchor: e.target.value as AnchorPoint });
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

  const onThicknessModeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...edge, thicknessMode: e.target.value as ThicknessMode });
    },
    [edge, onChange],
  );

  const onStrokeWidthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const v = parseFloat(e.target.value);
      onChange({ ...edge, strokeWidth: Number.isFinite(v) && v > 0 ? v : undefined });
    },
    [edge, onChange],
  );

  const onQueryIndexChange = useCallback(
    (key: 'sourceQueryIndex' | 'targetQueryIndex') =>
      (e: React.ChangeEvent<HTMLInputElement>): void => {
        const v = e.target.value;
        const parsed = v === '' ? undefined : parseInt(v, 10);
        onChange({
          ...edge,
          [key]: Number.isFinite(parsed) && parsed !== undefined && parsed >= 0 ? parsed : undefined,
        });
      },
    [edge, onChange],
  );

  const onLabelTemplateChange = useCallback(
    (key: 'sourceLabelTemplate' | 'targetLabelTemplate') =>
      (e: React.ChangeEvent<HTMLInputElement>): void => {
        onChange({ ...edge, [key]: e.target.value || undefined });
      },
    [edge, onChange],
  );

  const strokeWidthSlotProps = useMemo(() => ({ htmlInput: { min: 1, step: 1 } }), []);

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">Edge properties</Typography>

      <TextField label="Name" size="small" value={edge.name ?? ''} placeholder={edge.id} onChange={onNameChange} />

      <SelectField label="Source" value={edge.source} onChange={onSourceChange}>
        {nodes.map((n) => (
          <MenuItem key={n.id} value={n.id}>
            {n.label ?? n.id}
          </MenuItem>
        ))}
      </SelectField>

      <SelectField label="Source anchor" value={edge.sourceAnchor ?? 'n'} onChange={onSourceAnchorChange}>
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
        onChange={onTargetAnchorChange}
      >
        {ANCHOR_OPTIONS.map((a) => (
          <MenuItem key={a.value} value={a.value}>
            {a.label}
          </MenuItem>
        ))}
      </SelectField>

      <FormControlLabel control={bidirectionalCheckbox} label="Bidirectional" />

      <SelectField label="Thickness mode" value={edge.thicknessMode ?? 'fixed'} onChange={onThicknessModeChange}>
        <MenuItem value="fixed">Fixed</MenuItem>
        <MenuItem value="threshold">Threshold</MenuItem>
      </SelectField>

      {(edge.thicknessMode ?? 'fixed') === 'fixed' ? (
        <TextField
          label="Stroke width"
          size="small"
          type="number"
          slotProps={strokeWidthSlotProps}
          value={edge.strokeWidth ?? ''}
          placeholder="default"
          onChange={onStrokeWidthChange}
        />
      ) : null}

      <SelectField
        label="Source → target query"
        value={edge.sourceQueryIndex ?? ''}
        onChange={onQueryIndexChange('sourceQueryIndex')}
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
        onChange={onLabelTemplateChange('sourceLabelTemplate')}
        helperText="Use {{value}} to show query result"
      />

      {edge.bidirectional ? (
        <>
          <SelectField
            label="Target → source query"
            value={edge.targetQueryIndex ?? ''}
            onChange={onQueryIndexChange('targetQueryIndex')}
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
            onChange={onLabelTemplateChange('targetLabelTemplate')}
            helperText="Use {{value}} to show query result"
          />
        </>
      ) : null}
    </Stack>
  );
}
