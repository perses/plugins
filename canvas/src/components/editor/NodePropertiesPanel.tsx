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

import { Autocomplete, Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { OptionsColorPicker } from '@perses-dev/components';
import { generateQueryNames, useDataQueriesContext } from '@perses-dev/plugin-system';
import type { ReactElement } from 'react';
import React, { useCallback, useMemo } from 'react';

import { useCanvasTheme } from '../../hooks/useCanvasTheme';
import type { NodeSpec } from '../../model';
import { ICON_NAMES } from '../../utils/icons';
import { SelectField } from '../shared/SelectField';
import { IconPreview } from './IconPreview';

const NUMERIC_INPUT_WIDTH = { width: 80 };

interface NodePropertiesPanelProps {
  node: NodeSpec;
  onChange: (updated: NodeSpec) => void;
}

export function NodePropertiesPanel({ node, onChange }: NodePropertiesPanelProps): ReactElement {
  const { queryDefinitions } = useDataQueriesContext();
  const { nodeDefaultFill } = useCanvasTheme();
  const queryCount = queryDefinitions.length;
  const queryNames = useMemo(() => generateQueryNames(queryDefinitions), [queryDefinitions]);
  const queryIndexes = useMemo(() => Array.from({ length: queryCount }, (_, i) => i), [queryCount]);
  const shape = node.kind;

  const parseNumberInput = useCallback(
    (
      currentValue: number | undefined,
      e: React.ChangeEvent<HTMLInputElement>,
      opts: { min?: number; optional?: boolean } = {},
    ) => {
      const v = e.target.valueAsNumber;
      if (Number.isFinite(v) && (opts.min === undefined || v >= opts.min)) return v;
      if (opts.optional && e.target.value === '') return undefined;
      return currentValue;
    },
    [],
  );

  const onNodeSpecChange = useCallback(
    (key: keyof NodeSpec, map: (e: React.ChangeEvent<HTMLInputElement>, node: NodeSpec) => NodeSpec[typeof key]) =>
      (e: React.ChangeEvent<HTMLInputElement>): void => {
        onChange({ ...node, [key]: map(e, node) });
      },
    [node, onChange],
  );

  const onFieldChange = useCallback(
    (key: keyof NodeSpec) => onNodeSpecChange(key, (e) => e.target.value),
    [onNodeSpecChange],
  );

  const onNodeSpecChangeNumberValue = useCallback(
    (
      key: keyof Pick<NodeSpec, 'width' | 'height' | 'labelPadding' | 'queryIndex'>,
      opts: { min?: number; optional?: boolean } = { min: 8 },
    ) => onNodeSpecChange(key, (e, n) => parseNumberInput(n[key], e, opts)),
    [onNodeSpecChange, parseNumberInput],
  );

  const onPositionChange = useCallback(
    (axis: 'x' | 'y') =>
      onNodeSpecChange('position', (e, n) => ({
        ...n.position,
        [axis]: parseNumberInput(n.position[axis], e) ?? n.position[axis],
      })),
    [onNodeSpecChange, parseNumberInput],
  );

  const onIconChange = useCallback(
    (_: React.SyntheticEvent, newIcon: string | null): void => {
      onChange({ ...node, icon: newIcon ?? undefined });
    },
    [node, onChange],
  );

  const onColorChange = useCallback(
    (color: string): void => {
      onChange({ ...node, color });
    },
    [node, onChange],
  );

  const onColorClear = useCallback((): void => {
    onChange({ ...node, color: undefined });
  }, [node, onChange]);

  const isOptionEqualToValue = useCallback((option: string, value: string) => option === value, []);

  const renderInput = useCallback(
    (params: object) => <TextField {...(params as Record<string, unknown>)} label="Icon" size="small" />,
    [],
  );

  const renderOption = useCallback(
    (props: React.HTMLAttributes<HTMLLIElement>, name: string) => (
      <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconPreview name={name} />
        <Typography variant="body2">{name}</Typography>
      </Box>
    ),
    [],
  );

  const colorBoxSx = useMemo(
    () => ({
      flexShrink: 0,
      opacity: node.colorMode !== 'fixed' ? 0.38 : 1,
      pointerEvents: node.colorMode !== 'fixed' ? ('none' as const) : ('auto' as const),
    }),
    [node.colorMode],
  );

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">Node properties</Typography>

      <Stack direction="row" spacing={1}>
        <TextField
          label="X"
          size="small"
          type="number"
          value={Math.round(node.position.x)}
          onChange={onPositionChange('x')}
          sx={NUMERIC_INPUT_WIDTH}
        />
        <TextField
          label="Y"
          size="small"
          type="number"
          value={Math.round(node.position.y)}
          onChange={onPositionChange('y')}
          sx={NUMERIC_INPUT_WIDTH}
        />
        <TextField
          label="Width"
          size="small"
          type="number"
          value={Math.round(node.width)}
          slotProps={{ htmlInput: { min: 8 } }}
          onChange={onNodeSpecChangeNumberValue('width')}
          sx={NUMERIC_INPUT_WIDTH}
        />
        <TextField
          label="Height"
          size="small"
          type="number"
          value={Math.round(node.height)}
          slotProps={{ htmlInput: { min: 8 } }}
          onChange={onNodeSpecChangeNumberValue('height')}
          sx={NUMERIC_INPUT_WIDTH}
        />
      </Stack>

      <SelectField label="Kind" value={shape} onChange={onFieldChange('kind')}>
        <MenuItem value="rectangle">Rectangle</MenuItem>
        <MenuItem value="icon">Icon</MenuItem>
        <MenuItem value="text">Text</MenuItem>
      </SelectField>

      {shape !== 'text' ? (
        <Autocomplete
          options={ICON_NAMES}
          value={node.icon ?? null}
          onChange={onIconChange}
          renderInput={renderInput}
          renderOption={renderOption}
          isOptionEqualToValue={isOptionEqualToValue}
          clearOnEscape
          size="small"
        />
      ) : null}

      {shape === 'rectangle' ? (
        <TextField
          label="Background image URL"
          size="small"
          value={node.backgroundImage ?? ''}
          onChange={onFieldChange('backgroundImage')}
        />
      ) : null}

      <TextField
        label="URL"
        size="small"
        value={node.url ?? ''}
        onChange={onFieldChange('url')}
        helperText="Navigate to this URL on click. Use ${varName} for dashboard variables."
      />

      <TextField
        label="Label"
        size="small"
        value={node.label ?? ''}
        onChange={onFieldChange('label')}
        helperText="Use {{label_name}} or {{value}} to interpolate query data"
      />

      {shape !== 'text' ? (
        <Stack direction="row" spacing={1}>
          <SelectField
            label="Label position"
            value={node.labelPosition ?? 'below'}
            onChange={onFieldChange('labelPosition')}
            sx={{ flex: 1 }}
          >
            <MenuItem value="below">Below</MenuItem>
            <MenuItem value="above">Above</MenuItem>
            <MenuItem value="left">Left</MenuItem>
            <MenuItem value="right">Right</MenuItem>
            <MenuItem value="center">Center</MenuItem>
          </SelectField>
          <TextField
            label="Label padding"
            size="small"
            type="number"
            slotProps={{ htmlInput: { min: 0, step: 1 } }}
            value={node.labelPadding ?? ''}
            placeholder="12"
            onChange={onNodeSpecChangeNumberValue('labelPadding', { min: 0, optional: true })}
            sx={NUMERIC_INPUT_WIDTH}
          />
        </Stack>
      ) : null}

      <SelectField
        label="Query"
        value={node.queryIndex ?? ''}
        onChange={onNodeSpecChangeNumberValue('queryIndex', { min: 0 })}
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
      </SelectField>

      <Stack direction="row" spacing={1} alignItems="center">
        <SelectField
          label="Color mode"
          value={node.colorMode ?? ''}
          onChange={onFieldChange('colorMode')}
          sx={{ flex: 1 }}
        >
          <MenuItem value="">
            <em>None (default)</em>
          </MenuItem>
          <MenuItem value="threshold">Threshold</MenuItem>
          <MenuItem value="fixed">Fixed</MenuItem>
        </SelectField>

        <Box sx={colorBoxSx}>
          <OptionsColorPicker
            label="Color"
            color={node.color ?? nodeDefaultFill}
            onColorChange={onColorChange}
            onClear={onColorClear}
          />
        </Box>
      </Stack>
    </Stack>
  );
}
