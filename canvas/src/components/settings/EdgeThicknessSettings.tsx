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
import { formatValue, StepOptions } from '@perses-dev/components';
import { produce } from 'immer';
import React, { ReactElement, useCallback, useMemo } from 'react';

import { CanvasSpec } from '../../model';

const STROKE_SLOT_PROPS = {
  htmlInput: { min: 1, step: 1 },
  input: { endAdornment: <InputAdornment position="end">px</InputAdornment> },
} as const;

const ROW_BOX_SX = { display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 } as const;
const ROW_CAPTION_SX = { minWidth: 70, color: 'text.secondary' } as const;
const ROW_TEXT_WIDTH_SX = { width: 100 } as const;
const DEFAULT_STROKE_SX = { mb: 1, width: 180 } as const;
const BLOCK_CAPTION_SX = { display: 'block', mb: 0.5 } as const;

interface EdgeThicknessSettingsProps {
  value: CanvasSpec;
  onChange: (value: CanvasSpec) => void;
}

interface ThresholdWidthRowProps {
  step: StepOptions;
  strokeWidth: number | undefined;
  format: CanvasSpec['format'];
  onChange: (strokeWidth: number | undefined) => void;
}

function ThresholdWidthRow({ step, strokeWidth, format, onChange }: ThresholdWidthRowProps): ReactElement {
  const onWidthChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const parsed = parseFloat(event.target.value);
      onChange(Number.isFinite(parsed) && parsed > 0 ? parsed : undefined);
    },
    [onChange],
  );

  return (
    <Box sx={ROW_BOX_SX}>
      <Typography variant="caption" sx={ROW_CAPTION_SX}>
        ≥ {formatValue(step.value, format)}
      </Typography>
      <TextField
        size="small"
        type="number"
        slotProps={STROKE_SLOT_PROPS}
        value={strokeWidth ?? ''}
        onChange={onWidthChange}
        sx={ROW_TEXT_WIDTH_SX}
      />
    </Box>
  );
}

export function EdgeThicknessSettings({ value, onChange }: EdgeThicknessSettingsProps): ReactElement {
  const thresholdSteps = useMemo(() => value.thresholds?.steps ?? [], [value.thresholds]);

  const onDefaultStrokeWidthChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const parsed = parseFloat(event.target.value);
      onChange({
        ...value,
        edgeDefaultStrokeWidth: Number.isFinite(parsed) && parsed > 0 ? parsed : undefined,
      });
    },
    [value, onChange],
  );

  const onThresholdWidthChange = useCallback(
    (stepValue: number, strokeWidth: number | undefined): void => {
      onChange(
        produce(value, (draft) => {
          draft.edgeThresholdWidths ??= [];
          const existingIdx = draft.edgeThresholdWidths.findIndex((w) => w.value === stepValue);
          if (strokeWidth !== undefined) {
            if (existingIdx >= 0) {
              draft.edgeThresholdWidths[existingIdx]!.strokeWidth = strokeWidth;
            } else {
              draft.edgeThresholdWidths.push({ value: stepValue, strokeWidth });
            }
          } else if (existingIdx >= 0) {
            draft.edgeThresholdWidths.splice(existingIdx, 1);
          }
        }),
      );
    },
    [value, onChange],
  );

  return (
    <>
      <TextField
        label="Default stroke width"
        size="small"
        type="number"
        slotProps={STROKE_SLOT_PROPS}
        value={value.edgeDefaultStrokeWidth ?? ''}
        onChange={onDefaultStrokeWidthChange}
        placeholder="2"
        sx={DEFAULT_STROKE_SX}
      />
      {thresholdSteps.length > 0 ? (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={BLOCK_CAPTION_SX}>
            Per-threshold widths
          </Typography>
          {thresholdSteps.map((step) => {
            const handleChange = (strokeWidth: number | undefined): void =>
              onThresholdWidthChange(step.value, strokeWidth);
            return (
              <ThresholdWidthRow
                key={step.value}
                step={step}
                strokeWidth={value.edgeThresholdWidths?.find((w) => w.value === step.value)?.strokeWidth}
                format={value.format}
                onChange={handleChange}
              />
            );
          })}
        </Box>
      ) : null}
    </>
  );
}
