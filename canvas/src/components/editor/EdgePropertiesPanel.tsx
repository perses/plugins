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

import React, { ReactElement, useCallback, useMemo } from 'react';
import { Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { generateQueryNames, useDataQueriesContext } from '@perses-dev/plugin-system';
import { AnchorPoint, EdgeSpec, NodeSpec } from '../../model';

const ANCHOR_OPTIONS: AnchorPoint[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];

interface EdgePropertiesPanelProps {
  edge: EdgeSpec;
  nodes: NodeSpec[];
  onChange: (updated: EdgeSpec) => void;
}

export function EdgePropertiesPanel({ edge, nodes, onChange }: EdgePropertiesPanelProps): ReactElement {
  const hasFreeTarget = edge.target === '';
  const { queryDefinitions } = useDataQueriesContext();
  const queryCount = queryDefinitions.length;
  const queryNames = useMemo(() => generateQueryNames(queryDefinitions), [queryDefinitions]);
  const queryIndexes = Array.from({ length: queryCount }, (_, i) => i);

  const onSourceChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...edge, source: e.target.value });
    },
    [edge, onChange]
  );

  const onSourceAnchorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...edge, sourceAnchor: e.target.value as AnchorPoint });
    },
    [edge, onChange]
  );

  const onTargetChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      onChange({
        ...edge,
        target: e.target.value,
        targetAnchor: edge.targetAnchor ?? 'n',
        x2: undefined,
        y2: undefined,
      });
    },
    [edge, onChange]
  );

  const onTargetAnchorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...edge, targetAnchor: e.target.value as AnchorPoint });
    },
    [edge, onChange]
  );

  const onBidirectionalChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...edge, bidirectional: e.target.checked || undefined });
    },
    [edge, onChange]
  );

  const onThicknessModeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...edge, thicknessMode: e.target.value as 'fixed' | 'threshold' });
    },
    [edge, onChange]
  );

  const onStrokeWidthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const v = parseFloat(e.target.value);
      onChange({ ...edge, strokeWidth: Number.isFinite(v) && v > 0 ? v : undefined });
    },
    [edge, onChange]
  );

  const onSourceQueryIndexChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const v = e.target.value;
      onChange({ ...edge, sourceQueryIndex: v === '' ? undefined : Number(v) });
    },
    [edge, onChange]
  );

  const onSourceLabelTemplateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...edge, sourceLabelTemplate: e.target.value || undefined });
    },
    [edge, onChange]
  );

  const onTargetQueryIndexChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const v = e.target.value;
      onChange({ ...edge, targetQueryIndex: v === '' ? undefined : Number(v) });
    },
    [edge, onChange]
  );

  const onTargetLabelTemplateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...edge, targetLabelTemplate: e.target.value || undefined });
    },
    [edge, onChange]
  );

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">Edge properties</Typography>

      <TextField
        label="Name"
        size="small"
        value={edge.name ?? ''}
        placeholder={edge.id}
        onChange={(e) => onChange({ ...edge, name: e.target.value || undefined })}
      />

      <TextField
        select
        label="Source"
        size="small"
        value={edge.source}
        onChange={onSourceChange}
        slotProps={{ select: { MenuProps: { PaperProps: { style: { maxHeight: 240 } } } } }}
      >
        {nodes.map((n) => (
          <MenuItem key={n.id} value={n.id}>
            {n.label ?? n.id}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="Source anchor"
        size="small"
        value={edge.sourceAnchor ?? 'n'}
        onChange={onSourceAnchorChange}
        slotProps={{ select: { MenuProps: { PaperProps: { style: { maxHeight: 240 } } } } }}
      >
        {ANCHOR_OPTIONS.map((a) => (
          <MenuItem key={a} value={a}>
            {a}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="Target"
        size="small"
        value={edge.target}
        onChange={onTargetChange}
        slotProps={{ select: { MenuProps: { PaperProps: { style: { maxHeight: 240 } } } } }}
      >
        {nodes.map((n) => (
          <MenuItem key={n.id} value={n.id}>
            {n.label ?? n.id}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="Target anchor"
        size="small"
        value={edge.targetAnchor ?? 'n'}
        disabled={hasFreeTarget}
        onChange={onTargetAnchorChange}
        slotProps={{ select: { MenuProps: { PaperProps: { style: { maxHeight: 240 } } } } }}
      >
        {ANCHOR_OPTIONS.map((a) => (
          <MenuItem key={a} value={a}>
            {a}
          </MenuItem>
        ))}
      </TextField>

      <FormControlLabel
        control={<Checkbox size="small" checked={edge.bidirectional ?? false} onChange={onBidirectionalChange} />}
        label="Bidirectional"
      />

      <TextField
        select
        label="Thickness mode"
        size="small"
        value={edge.thicknessMode ?? 'fixed'}
        onChange={onThicknessModeChange}
        slotProps={{ select: { MenuProps: { PaperProps: { style: { maxHeight: 240 } } } } }}
      >
        <MenuItem value="fixed">Fixed</MenuItem>
        <MenuItem value="threshold">Threshold</MenuItem>
      </TextField>

      {(edge.thicknessMode ?? 'fixed') === 'fixed' && (
        <TextField
          label="Stroke width"
          size="small"
          type="number"
          slotProps={{ htmlInput: { min: 1, step: 1 } }}
          value={edge.strokeWidth ?? ''}
          placeholder="default"
          onChange={onStrokeWidthChange}
        />
      )}

      <TextField
        select
        label="Source → target query"
        size="small"
        value={edge.sourceQueryIndex ?? ''}
        onChange={onSourceQueryIndexChange}
        slotProps={{ select: { MenuProps: { PaperProps: { style: { maxHeight: 240 } } } } }}
      >
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
        {queryIndexes.map((qi) => (
          <MenuItem key={qi} value={qi}>
            {queryNames[qi] ?? `#${qi + 1}`}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        label="Source label template"
        size="small"
        value={edge.sourceLabelTemplate ?? ''}
        onChange={onSourceLabelTemplateChange}
        helperText="Use {{value}} to show query result"
      />

      {edge.bidirectional && (
        <>
          <TextField
            select
            label="Target → source query"
            size="small"
            value={edge.targetQueryIndex ?? ''}
            onChange={onTargetQueryIndexChange}
            slotProps={{ select: { MenuProps: { PaperProps: { style: { maxHeight: 240 } } } } }}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {queryIndexes.map((qi) => (
              <MenuItem key={qi} value={qi}>
                {queryNames[qi] ?? `#${qi + 1}`}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Target label template"
            size="small"
            value={edge.targetLabelTemplate ?? ''}
            onChange={onTargetLabelTemplateChange}
            helperText="Use {{value}} to show query result"
          />
        </>
      )}
    </Stack>
  );
}
