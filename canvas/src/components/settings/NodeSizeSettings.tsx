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

import { Box, InputAdornment, TextField, Typography } from '@mui/material';
import type { StepOptions } from '@perses-dev/components';
import { formatValue } from '@perses-dev/components';
import { produce } from 'immer';
import type { ReactElement } from 'react';
import React, { useCallback, useMemo } from 'react';

import type { CanvasSpec } from '../../model';

const SCALE_SLOT_PROPS = {
  htmlInput: { min: 0.1, step: 0.1 },
  input: { endAdornment: <InputAdornment position="end">×</InputAdornment> },
} as const;

const SIZE_SLOT_PROPS = {
  htmlInput: { min: 1, step: 1 },
  input: { endAdornment: <InputAdornment position="end">px</InputAdornment> },
} as const;

const ROW_BOX_SX = { display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 } as const;
const ROW_CAPTION_SX = { minWidth: 70, color: 'text.secondary' } as const;
const ROW_TEXT_WIDTH_SX = { width: 100 } as const;
const DEFAULT_SIZE_SX = { mb: 1, width: 180 } as const;
const BLOCK_CAPTION_SX = { display: 'block', mb: 0.5 } as const;

interface NodeSizeSettingsProps {
  value: CanvasSpec;
  onChange: (value: CanvasSpec) => void;
}

interface ThresholdScaleRowProps {
  step: StepOptions;
  scale: number | undefined;
  format: CanvasSpec['format'];
  onThresholdScaleChange: (stepValue: number, scale: number | undefined) => void;
}

function ThresholdScaleRow({ step, scale, format, onThresholdScaleChange }: ThresholdScaleRowProps): ReactElement {
  const onScaleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const parsed = parseFloat(event.target.value);
      onThresholdScaleChange(step.value, Number.isFinite(parsed) && parsed > 0 ? parsed : undefined);
    },
    [step.value, onThresholdScaleChange],
  );

  const thresholdLabel = formatValue(step.value, format);
  // MUI forwards accessibility attributes to the underlying input via the `htmlInput` slot, not the
  // top-level props, so the screen-reader name must be set there alongside the numeric constraints.
  const scaleSlotProps = useMemo(
    () => ({
      ...SCALE_SLOT_PROPS,
      htmlInput: { ...SCALE_SLOT_PROPS.htmlInput, 'aria-label': `Size multiplier for values ≥ ${thresholdLabel}` },
    }),
    [thresholdLabel],
  );

  return (
    <Box sx={ROW_BOX_SX}>
      <Typography variant="caption" sx={ROW_CAPTION_SX}>
        ≥ {thresholdLabel}
      </Typography>
      <TextField
        size="small"
        type="number"
        slotProps={scaleSlotProps}
        value={scale ?? ''}
        onChange={onScaleChange}
        sx={ROW_TEXT_WIDTH_SX}
      />
    </Box>
  );
}

export function NodeSizeSettings({ value, onChange }: NodeSizeSettingsProps): ReactElement {
  const thresholdSteps = useMemo(() => value.thresholds?.steps ?? [], [value.thresholds]);

  const onDefaultSizeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const parsed = parseFloat(event.target.value);
      onChange({
        ...value,
        nodeDefaultSize: Number.isFinite(parsed) && parsed > 0 ? parsed : undefined,
      });
    },
    [value, onChange],
  );

  const onThresholdScaleChange = useCallback(
    (stepValue: number, scale: number | undefined): void => {
      onChange(
        produce(value, (draft) => {
          draft.nodeThresholdSizes = draft.nodeThresholdSizes ?? [];
          const existingIdx = draft.nodeThresholdSizes.findIndex((s) => s.value === stepValue);
          if (scale !== undefined) {
            if (existingIdx >= 0) {
              draft.nodeThresholdSizes[existingIdx]!.scale = scale;
            } else {
              draft.nodeThresholdSizes.push({ value: stepValue, scale });
            }
          } else if (existingIdx >= 0) {
            draft.nodeThresholdSizes.splice(existingIdx, 1);
          }
        }),
      );
    },
    [value, onChange],
  );

  return (
    <>
      <TextField
        label="Default size"
        size="small"
        type="number"
        slotProps={SIZE_SLOT_PROPS}
        value={value.nodeDefaultSize ?? ''}
        onChange={onDefaultSizeChange}
        placeholder="48"
        sx={DEFAULT_SIZE_SX}
      />
      {thresholdSteps.length > 0 ? (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={BLOCK_CAPTION_SX}>
            Per-threshold size multipliers
          </Typography>
          {thresholdSteps.map((step) => (
            <ThresholdScaleRow
              key={step.value}
              step={step}
              scale={value.nodeThresholdSizes?.find((s) => s.value === step.value)?.scale}
              format={value.format}
              onThresholdScaleChange={onThresholdScaleChange}
            />
          ))}
        </Box>
      ) : (
        <Typography variant="caption" color="text.secondary">
          Add node color thresholds to scale nodes by value.
        </Typography>
      )}
    </>
  );
}
