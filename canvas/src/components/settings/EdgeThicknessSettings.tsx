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
import { Box, InputAdornment, TextField, Typography } from '@mui/material';
import { formatValue, StepOptions } from '@perses-dev/components';
import { produce } from 'immer';
import { CanvasSpec } from '../../model';

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
    [onChange]
  );

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
      <Typography variant="caption" sx={{ minWidth: 70, color: 'text.secondary' }}>
        ≥ {formatValue(step.value, format)}
      </Typography>
      <TextField
        size="small"
        type="number"
        slotProps={{
          htmlInput: { min: 1, step: 1 },
          input: { endAdornment: <InputAdornment position="end">px</InputAdornment> },
        }}
        value={strokeWidth ?? ''}
        onChange={onWidthChange}
        sx={{ width: 100 }}
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
    [value, onChange]
  );

  const onThresholdWidthChange = useCallback(
    (stepValue: number, strokeWidth: number | undefined): void => {
      onChange(
        produce(value, (draft) => {
          draft.edgeThresholdWidths ??= [];
          const existing = draft.edgeThresholdWidths.findIndex((w) => w.value === stepValue);
          if (strokeWidth !== undefined) {
            if (existing >= 0) {
              draft.edgeThresholdWidths[existing]!.strokeWidth = strokeWidth;
            } else {
              draft.edgeThresholdWidths.push({ value: stepValue, strokeWidth });
            }
          } else if (existing >= 0) {
            draft.edgeThresholdWidths.splice(existing, 1);
          }
        })
      );
    },
    [value, onChange]
  );

  return (
    <>
      <TextField
        label="Default stroke width"
        size="small"
        type="number"
        slotProps={{
          htmlInput: { min: 1, step: 1 },
          input: { endAdornment: <InputAdornment position="end">px</InputAdornment> },
        }}
        value={value.edgeDefaultStrokeWidth ?? ''}
        onChange={onDefaultStrokeWidthChange}
        placeholder="2"
        sx={{ mb: 1, width: 180 }}
      />
      {thresholdSteps.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Per-threshold widths
          </Typography>
          {thresholdSteps.map((step) => (
            <ThresholdWidthRow
              key={step.value}
              step={step}
              strokeWidth={value.edgeThresholdWidths?.find((w) => w.value === step.value)?.strokeWidth}
              format={value.format}
              onChange={(strokeWidth) => onThresholdWidthChange(step.value, strokeWidth)}
            />
          ))}
        </Box>
      )}
    </>
  );
}
