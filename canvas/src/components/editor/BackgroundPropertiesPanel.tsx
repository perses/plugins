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

import type { SelectChangeEvent } from '@mui/material';
import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { OptionsColorPicker } from '@perses-dev/components';
import ArrowDownIcon from 'mdi-material-ui/ArrowDown';
import ArrowUpIcon from 'mdi-material-ui/ArrowUp';
import type { ReactElement } from 'react';
import React, { useCallback, useMemo } from 'react';

import { useSpecContext } from '../../contexts/SpecContext';
import { useCanvasTheme } from '../../hooks/useCanvasTheme';
import type { BackgroundSpec, CanvasSpec } from '../../model';
import { parseNumberInput } from '../../utils/inputUtils';
import { NumberField } from '../shared/NumberField';

function formatOpacityLabel(v: number): string {
  return `${Math.round(v * 100)}%`;
}

interface BackgroundPropertiesPanelProps {
  background: BackgroundSpec;
  onChange: (updated: BackgroundSpec) => void;
}

export function BackgroundPropertiesPanel({ background, onChange }: BackgroundPropertiesPanelProps): ReactElement {
  const { nodeDefaultFill } = useCanvasTheme();
  const { spec, moveBackground } = useSpecContext();

  const backgrounds: CanvasSpec['backgrounds'] = spec.backgrounds ?? [];
  const idx = backgrounds.findIndex((bg) => bg.id === background.id);

  const onBgSpecChange = useCallback(
    (
      key: keyof BackgroundSpec,
      map: (e: React.ChangeEvent<HTMLInputElement>, bg: BackgroundSpec) => BackgroundSpec[typeof key],
    ) =>
      (e: React.ChangeEvent<HTMLInputElement>): void => {
        onChange({ ...background, [key]: map(e, background) });
      },
    [background, onChange],
  );

  const onFieldChange = useCallback(
    (key: keyof BackgroundSpec) => onBgSpecChange(key, (e) => e.target.value || undefined),
    [onBgSpecChange],
  );

  const onNumberFieldChange = useCallback(
    (key: 'width' | 'height', opts: { min?: number } = {}) =>
      onBgSpecChange(key, (e, bg) => parseNumberInput(e.target.value, bg[key], opts) ?? bg[key]),
    [onBgSpecChange],
  );

  const onPositionChange = useCallback(
    (axis: 'x' | 'y') =>
      onBgSpecChange('position', (e, bg) => ({
        ...bg.position,
        [axis]: parseNumberInput(e.target.value, bg.position[axis]) ?? bg.position[axis],
      })),
    [onBgSpecChange],
  );

  const onGlobalChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      onChange({ ...background, global: e.target.checked || undefined });
    },
    [background, onChange],
  );

  const onColorChange = useCallback(
    (color: string): void => {
      onChange({ ...background, color });
    },
    [background, onChange],
  );

  const onColorClear = useCallback((): void => {
    onChange({ ...background, color: undefined });
  }, [background, onChange]);

  const onOpacityChange = useCallback(
    (_: Event, v: number | number[]): void => {
      onChange({ ...background, opacity: Array.isArray(v) ? v[0] : v });
    },
    [background, onChange],
  );

  const onImageFitChange = useCallback(
    (e: SelectChangeEvent<BackgroundSpec['imageFit']>): void => {
      onChange({ ...background, imageFit: e.target.value as BackgroundSpec['imageFit'] });
    },
    [background, onChange],
  );

  const onMoveUp = useCallback((): void => {
    moveBackground(background.id, 'up');
  }, [background.id, moveBackground]);

  const onMoveDown = useCallback((): void => {
    moveBackground(background.id, 'down');
  }, [background.id, moveBackground]);

  const globalCheckbox = useMemo(
    () => <Checkbox size="small" checked={background.global ?? false} onChange={onGlobalChange} />,
    [background.global, onGlobalChange],
  );

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="subtitle2" sx={{ flex: 1 }}>
          Background properties
        </Typography>
        <Tooltip title="Move up (render below)">
          <span>
            <IconButton size="small" disabled={idx <= 0} onClick={onMoveUp}>
              <ArrowUpIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Move down (render above)">
          <span>
            <IconButton size="small" disabled={idx >= backgrounds.length - 1} onClick={onMoveDown}>
              <ArrowDownIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <FormControlLabel control={globalCheckbox} label="Global (fit panel)" />

      <TextField
        label="Name"
        size="small"
        value={background.name ?? ''}
        onChange={onFieldChange('name')}
        placeholder={background.id}
      />

      <Stack direction="row" spacing={1}>
        <NumberField
          label="X"
          value={Math.round(background.position.x)}
          onChange={onPositionChange('x')}
          disabled={background.global}
        />
        <NumberField
          label="Y"
          value={Math.round(background.position.y)}
          onChange={onPositionChange('y')}
          disabled={background.global}
        />
        <NumberField
          label="Width"
          min={1}
          value={Math.round(background.width)}
          onChange={onNumberFieldChange('width', { min: 1 })}
          disabled={background.global}
        />
        <NumberField
          label="Height"
          min={1}
          value={Math.round(background.height)}
          onChange={onNumberFieldChange('height', { min: 1 })}
          disabled={background.global}
        />
      </Stack>

      <Stack direction="row" spacing={2} alignItems="center" paddingRight={3}>
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 40 }}>
          Color
        </Typography>
        <Box sx={{ flexShrink: 0 }}>
          <OptionsColorPicker
            label="Color"
            color={background.color ?? nodeDefaultFill}
            onColorChange={onColorChange}
            onClear={onColorClear}
          />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
          Opacity
        </Typography>
        <Slider
          size="small"
          min={0}
          max={1}
          step={0.05}
          value={background.opacity ?? 1}
          onChange={onOpacityChange}
          valueLabelDisplay="auto"
          valueLabelFormat={formatOpacityLabel}
          sx={{ pr: 2 }}
        />
      </Stack>

      <Stack direction="row" spacing={1} alignItems="flex-start">
        <TextField
          label="Image URL"
          size="small"
          value={background.image ?? ''}
          onChange={onFieldChange('image')}
          sx={{ flex: 1 }}
        />
        <FormControl size="small" sx={{ width: 110 }} disabled={!background.image}>
          <InputLabel>Image fit</InputLabel>
          <Select<BackgroundSpec['imageFit']>
            label="Image fit"
            value={background.imageFit ?? 'cover'}
            onChange={onImageFitChange}
            MenuProps={{ PaperProps: { style: { maxHeight: 240 } } }}
          >
            <MenuItem value="cover">Cover</MenuItem>
            <MenuItem value="contain">Contain</MenuItem>
            <MenuItem value="stretch">Stretch</MenuItem>
          </Select>
        </FormControl>
      </Stack>
    </Stack>
  );
}
