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
import { Autocomplete, Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { OptionsColorPicker } from '@perses-dev/components';
import { generateQueryNames, useDataQueriesContext } from '@perses-dev/plugin-system';
import { NodeSpec } from '../../model';
import { ICON_NAMES } from '../../utils/icons';
import { useCanvasTheme } from '../../hooks/useCanvasTheme';
import { IconPreview } from './IconPreview';

interface NodePropertiesPanelProps {
  node: NodeSpec;
  onChange: (updated: NodeSpec) => void;
}

export function NodePropertiesPanel({ node, onChange }: NodePropertiesPanelProps): ReactElement {
  const { queryDefinitions } = useDataQueriesContext();
  const { nodeDefaultFill } = useCanvasTheme();
  const queryCount = queryDefinitions.length;
  const queryNames = useMemo(() => generateQueryNames(queryDefinitions), [queryDefinitions]);
  const queryIndexes = Array.from({ length: queryCount }, (_, i) => i);
  const shape = node.kind;

  const onIntFieldChange = useCallback(
    (key: 'x' | 'y' | 'width' | 'height' | 'labelPadding', min = -Infinity, optional = false) =>
      (e: React.ChangeEvent<HTMLInputElement>): void => {
        const v = e.target.valueAsNumber;
        if (Number.isFinite(v) && v >= min) {
          onChange({ ...node, [key]: v });
        } else if (optional && e.target.value === '') {
          onChange({ ...node, [key]: undefined });
        }
      },
    [node, onChange]
  );

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">Node properties</Typography>

      <Stack direction="row" spacing={1}>
        <TextField
          label="X"
          size="small"
          type="number"
          value={Math.round(node.x)}
          onChange={onIntFieldChange('x')}
          sx={{ width: 80 }}
        />
        <TextField
          label="Y"
          size="small"
          type="number"
          value={Math.round(node.y)}
          onChange={onIntFieldChange('y')}
          sx={{ width: 80 }}
        />
        <TextField
          label="Width"
          size="small"
          type="number"
          value={Math.round(node.width)}
          slotProps={{ htmlInput: { min: 8 } }}
          onChange={onIntFieldChange('width', 8)}
          sx={{ width: 80 }}
        />
        <TextField
          label="Height"
          size="small"
          type="number"
          value={Math.round(node.height)}
          slotProps={{ htmlInput: { min: 8 } }}
          onChange={onIntFieldChange('height', 8)}
          sx={{ width: 80 }}
        />
      </Stack>

      <TextField
        select
        label="Kind"
        size="small"
        value={shape}
        onChange={(e) => onChange({ ...node, kind: e.target.value as NodeSpec['kind'] })}
        slotProps={{ select: { MenuProps: { PaperProps: { style: { maxHeight: 240 } } } } }}
      >
        <MenuItem value="rectangle">Rectangle</MenuItem>
        <MenuItem value="icon">Icon</MenuItem>
        <MenuItem value="text">Text</MenuItem>
      </TextField>

      {shape !== 'text' && (
        <Autocomplete
          options={ICON_NAMES}
          value={node.icon ?? null}
          onChange={(_, newIcon) => onChange({ ...node, icon: newIcon ?? undefined })}
          renderInput={(params) => <TextField {...params} label="Icon" size="small" />}
          renderOption={(props, name) => (
            <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconPreview name={name} />
              <Typography variant="body2">{name}</Typography>
            </Box>
          )}
          isOptionEqualToValue={(option, value) => option === value}
          clearOnEscape
          size="small"
        />
      )}

      {shape === 'rectangle' && (
        <TextField
          label="Background image URL"
          size="small"
          value={node.backgroundImage ?? ''}
          onChange={(e) => onChange({ ...node, backgroundImage: e.target.value || undefined })}
        />
      )}

      <TextField
        label="Link URL"
        size="small"
        value={node.link ?? ''}
        onChange={(e) => onChange({ ...node, link: e.target.value || undefined })}
        helperText="Navigate to this URL on click. Use ${varName} for dashboard variables."
      />

      <TextField
        label="Label"
        size="small"
        value={node.label ?? ''}
        onChange={(e) => onChange({ ...node, label: e.target.value || undefined })}
        helperText="Use {{label_name}} or {{value}} to interpolate query data"
      />

      {shape !== 'text' && (
        <Stack direction="row" spacing={1}>
          <TextField
            select
            label="Label position"
            size="small"
            value={node.labelPosition ?? 'below'}
            onChange={(e) => onChange({ ...node, labelPosition: e.target.value as NodeSpec['labelPosition'] })}
            slotProps={{ select: { MenuProps: { PaperProps: { style: { maxHeight: 240 } } } } }}
            sx={{ flex: 1 }}
          >
            <MenuItem value="below">Below</MenuItem>
            <MenuItem value="above">Above</MenuItem>
            <MenuItem value="left">Left</MenuItem>
            <MenuItem value="right">Right</MenuItem>
            <MenuItem value="center">Center</MenuItem>
          </TextField>
          <TextField
            label="Label padding"
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 0, step: 1 } }}
            value={node.labelPadding ?? ''}
            placeholder="12"
            onChange={onIntFieldChange('labelPadding', 0, true)}
            sx={{ width: 100 }}
          />
        </Stack>
      )}

      <TextField
        select
        label="Query"
        size="small"
        value={node.queryIndex ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          onChange({ ...node, queryIndex: v === '' ? undefined : Number(v) });
        }}
        slotProps={{ select: { MenuProps: { PaperProps: { style: { maxHeight: 240 } } } } }}
        sx={{ minWidth: 120 }}
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

      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          select
          label="Color mode"
          size="small"
          value={node.colorMode ?? ''}
          onChange={(e) => {
            const v = e.target.value as '' | 'threshold' | 'fixed';
            onChange({ ...node, colorMode: v === '' ? undefined : v });
          }}
          slotProps={{ select: { MenuProps: { PaperProps: { style: { maxHeight: 240 } } } } }}
          sx={{ flex: 1 }}
        >
          <MenuItem value="">
            <em>None (default)</em>
          </MenuItem>
          <MenuItem value="threshold">Threshold</MenuItem>
          <MenuItem value="fixed">Fixed</MenuItem>
        </TextField>

        <Box
          sx={{
            flexShrink: 0,
            opacity: node.colorMode !== 'fixed' ? 0.38 : 1,
            pointerEvents: node.colorMode !== 'fixed' ? 'none' : 'auto',
          }}
        >
          <OptionsColorPicker
            label="Color"
            color={node.color ?? nodeDefaultFill}
            onColorChange={(color) => onChange({ ...node, color })}
            onClear={() => onChange({ ...node, color: undefined })}
          />
        </Box>
      </Stack>
    </Stack>
  );
}
