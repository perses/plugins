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

import { FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import { generateQueryNames, useDataQueriesContext } from '@perses-dev/plugin-system';
import type { ReactElement } from 'react';
import { useCallback, useMemo } from 'react';

import type { CanvasSpec, GraphGenerationSpec } from '../../model';
import { SelectField } from '../shared/SelectField';

type GraphGenerationSettingsProps = {
  value: CanvasSpec;
  onChange: (next: CanvasSpec) => void;
};

const DEFAULT_GENERATION: GraphGenerationSpec = { enabled: true, nodeQueryIndex: 0, nodeIdLabel: '' };

export function GraphGenerationSettings({ value, onChange }: GraphGenerationSettingsProps): ReactElement {
  const { queryDefinitions } = useDataQueriesContext();
  const queryCount = queryDefinitions.length;
  const queryNames = useMemo(() => generateQueryNames(queryDefinitions), [queryDefinitions]);
  const queryIndexes = useMemo(() => Array.from({ length: queryCount }, (_, i) => i), [queryCount]);

  const generation = value.graphGeneration ?? DEFAULT_GENERATION;

  const update = useCallback(
    (patch: Partial<GraphGenerationSpec>): void => {
      onChange({ ...value, graphGeneration: { ...generation, ...patch } });
    },
    [value, onChange, generation],
  );

  const onNodeQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => update({ nodeQueryIndex: Number(e.target.value) }),
    [update],
  );
  const onEdgeQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void =>
      update({ edgeQueryIndex: e.target.value === '' ? undefined : Number(e.target.value) }),
    [update],
  );
  const onNodeIdLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => update({ nodeIdLabel: e.target.value }),
    [update],
  );
  const onNodeLabelTemplateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => update({ nodeLabelTemplate: e.target.value || undefined }),
    [update],
  );
  const onEdgeSourceLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => update({ edgeSourceLabel: e.target.value || undefined }),
    [update],
  );
  const onEdgeTargetLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => update({ edgeTargetLabel: e.target.value || undefined }),
    [update],
  );
  const onEdgeLabelTemplateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => update({ edgeLabelTemplate: e.target.value || undefined }),
    [update],
  );
  const onBidirectionalChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => update({ bidirectional: e.target.checked }),
    [update],
  );

  const bidirectionalSwitch = useMemo(
    () => <Switch checked={generation.bidirectional ?? false} onChange={onBidirectionalChange} />,
    [generation.bidirectional, onBidirectionalChange],
  );

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Nodes and edges are generated from query results and laid out automatically. Graph structure is inferred from
        series labels; node and edge colors use the thresholds above.
      </Typography>

      <Typography variant="subtitle2">Nodes</Typography>
      <SelectField label="Node query" value={String(generation.nodeQueryIndex ?? 0)} onChange={onNodeQueryChange}>
        {queryIndexes.map((qi) => (
          <MenuItem key={qi} value={String(qi)}>
            {queryNames[qi] ?? `#${qi + 1}`}
          </MenuItem>
        ))}
      </SelectField>
      <TextField
        label="Node id label"
        size="small"
        value={generation.nodeIdLabel ?? ''}
        onChange={onNodeIdLabelChange}
        helperText="Series label that identifies a node (e.g. instance)"
      />
      <TextField
        label="Node label template"
        size="small"
        value={generation.nodeLabelTemplate ?? ''}
        onChange={onNodeLabelTemplateChange}
        helperText="Optional. Use {{label_name}} or {{value}}. Defaults to the node id label."
      />

      <Typography variant="subtitle2">Edges</Typography>
      <SelectField
        label="Edge query"
        value={generation.edgeQueryIndex === undefined ? '' : String(generation.edgeQueryIndex)}
        onChange={onEdgeQueryChange}
      >
        <MenuItem value="">
          <em>None (nodes only)</em>
        </MenuItem>
        {queryIndexes.map((qi) => (
          <MenuItem key={qi} value={String(qi)}>
            {queryNames[qi] ?? `#${qi + 1}`}
          </MenuItem>
        ))}
      </SelectField>
      <TextField
        label="Edge source label"
        size="small"
        value={generation.edgeSourceLabel ?? ''}
        onChange={onEdgeSourceLabelChange}
        helperText="Series label for the edge's source node id"
      />
      <TextField
        label="Edge target label"
        size="small"
        value={generation.edgeTargetLabel ?? ''}
        onChange={onEdgeTargetLabelChange}
        helperText="Series label for the edge's target node id"
      />
      <TextField
        label="Edge label template"
        size="small"
        value={generation.edgeLabelTemplate ?? ''}
        onChange={onEdgeLabelTemplateChange}
        helperText="Optional. Use {{value}} to show the metric value."
      />
      <FormControlLabel control={bidirectionalSwitch} label="Bidirectional edges" />
    </Stack>
  );
}
