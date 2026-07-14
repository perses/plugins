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

import React, { ReactElement, useCallback } from 'react';
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
import ArrowUpIcon from 'mdi-material-ui/ArrowUp';
import ArrowDownIcon from 'mdi-material-ui/ArrowDown';
import { OptionsColorPicker } from '@perses-dev/components';
import { BackgroundSpec, CanvasSpec } from '../../model';
import { useCanvasTheme } from '../../hooks/useCanvasTheme';
import { useSpecContext } from '../../contexts/SpecContext';

interface BackgroundPropertiesPanelProps {
  background: BackgroundSpec;
  onChange: (updated: BackgroundSpec) => void;
}

export function BackgroundPropertiesPanel({ background, onChange }: BackgroundPropertiesPanelProps): ReactElement {
  const { nodeDefaultFill } = useCanvasTheme();
  const { spec, moveBackground } = useSpecContext();

  const backgrounds: CanvasSpec['backgrounds'] = spec.backgrounds ?? [];
  const idx = backgrounds.findIndex((bg) => bg.id === background.id);

  const onIntFieldChange = useCallback(
    (key: 'x' | 'y' | 'width' | 'height', min = -Infinity) =>
      (e: React.ChangeEvent<HTMLInputElement>): void => {
        const v = e.target.valueAsNumber;
        if (Number.isFinite(v) && v >= min) {
          onChange({ ...background, [key]: v });
        }
      },
    [background, onChange]
  );

  const IMAGE_FIT_OPTIONS: Array<BackgroundSpec['imageFit']> = ['cover', 'contain', 'stretch'];

  function parseImageFit(value: string): BackgroundSpec['imageFit'] {
    return IMAGE_FIT_OPTIONS.includes(value as BackgroundSpec['imageFit'])
      ? (value as BackgroundSpec['imageFit'])
      : undefined;
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="subtitle2" sx={{ flex: 1 }}>
          Background properties
        </Typography>
        <Tooltip title="Move up (render below)">
          <span>
            <IconButton size="small" disabled={idx <= 0} onClick={() => moveBackground(background.id, 'up')}>
              <ArrowUpIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Move down (render above)">
          <span>
            <IconButton
              size="small"
              disabled={idx >= backgrounds.length - 1}
              onClick={() => moveBackground(background.id, 'down')}
            >
              <ArrowDownIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={background.global ?? false}
            onChange={(e) => onChange({ ...background, global: e.target.checked || undefined })}
          />
        }
        label="Global (fit panel)"
      />

      <TextField
        label="Name"
        size="small"
        value={background.name ?? ''}
        onChange={(e) => onChange({ ...background, name: e.target.value || undefined })}
        placeholder={background.id}
      />

      <Stack direction="row" spacing={1}>
        <TextField
          label="X"
          size="small"
          type="number"
          value={Math.round(background.x)}
          onChange={onIntFieldChange('x')}
          sx={{ width: 80 }}
          disabled={background.global}
        />
        <TextField
          label="Y"
          size="small"
          type="number"
          value={Math.round(background.y)}
          onChange={onIntFieldChange('y')}
          sx={{ width: 80 }}
          disabled={background.global}
        />
        <TextField
          label="Width"
          size="small"
          type="number"
          value={Math.round(background.width)}
          slotProps={{ htmlInput: { min: 1 } }}
          onChange={onIntFieldChange('width', 1)}
          sx={{ width: 80 }}
          disabled={background.global}
        />
        <TextField
          label="Height"
          size="small"
          type="number"
          value={Math.round(background.height)}
          slotProps={{ htmlInput: { min: 1 } }}
          onChange={onIntFieldChange('height', 1)}
          sx={{ width: 80 }}
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
            onColorChange={(color) => onChange({ ...background, color })}
            onClear={() => onChange({ ...background, color: undefined })}
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
          onChange={(_, v) => onChange({ ...background, opacity: Array.isArray(v) ? v[0] : v })}
          valueLabelDisplay="auto"
          valueLabelFormat={(v) => `${Math.round(v * 100)}%`}
          sx={{ pr: 2 }}
        />
      </Stack>

      <Stack direction="row" spacing={1} alignItems="flex-start">
        <TextField
          label="Image URL"
          size="small"
          value={background.image ?? ''}
          onChange={(e) => onChange({ ...background, image: e.target.value || undefined })}
          sx={{ flex: 1 }}
        />
        <FormControl size="small" sx={{ width: 110 }} disabled={!background.image}>
          <InputLabel>Image fit</InputLabel>
          <Select<BackgroundSpec['imageFit']>
            label="Image fit"
            value={background.imageFit ?? 'cover'}
            onChange={(e) => onChange({ ...background, imageFit: parseImageFit(e.target.value ?? '') })}
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
