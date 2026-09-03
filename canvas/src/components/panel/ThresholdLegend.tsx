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

import { useTheme } from '@mui/material';
import type { FormatOptions, ThresholdOptions } from '@perses-dev/components';
import { formatValue } from '@perses-dev/components';
import type { ReactElement } from 'react';
import { useMemo } from 'react';

import type { Point } from '../../model';

const SWATCH_SIZE = 12;
const ROW_HEIGHT = 18;
const LABEL_OFFSET = SWATCH_SIZE + 6;
const PADDING = 8;
const FONT_SIZE = 11;
const NO_SELECT_STYLE = { userSelect: 'none' } as const;

interface ThresholdLegendProps {
  thresholds: ThresholdOptions;
  format: FormatOptions | undefined;
  paletteColors: string[];
  position: Point;
}

export function ThresholdLegend({ thresholds, format, paletteColors, position }: ThresholdLegendProps): ReactElement {
  const muiTheme = useTheme();
  const defaultColor = thresholds.defaultColor ?? paletteColors[0] ?? muiTheme.palette.success.main;
  const steps = useMemo(() => thresholds.steps ?? [], [thresholds.steps]);

  const rows = useMemo(
    () => [
      ...steps.map((step, i) => ({
        color: step.color ?? paletteColors[i] ?? defaultColor,
        label: `≥ ${formatValue(step.value, format)}`,
        key: String(step.value),
      })),
      { color: defaultColor, label: 'default', key: 'default' },
    ],
    [steps, paletteColors, defaultColor, format],
  );

  const boxWidth = 110;
  const boxHeight = rows.length * ROW_HEIGHT + PADDING * 2;

  return (
    <g>
      <rect
        x={position.x}
        y={position.y}
        width={boxWidth}
        height={boxHeight}
        fill={muiTheme.palette.background.paper}
        fillOpacity={0.9}
        stroke={muiTheme.palette.divider}
        strokeWidth={1}
        rx={4}
      />
      {rows.map((row, i) => {
        const ry = position.y + PADDING + i * ROW_HEIGHT + (ROW_HEIGHT - SWATCH_SIZE) / 2;
        return (
          <g key={row.key}>
            <rect x={position.x + PADDING} y={ry} width={SWATCH_SIZE} height={SWATCH_SIZE} fill={row.color} rx={2} />
            <text
              x={position.x + PADDING + LABEL_OFFSET}
              y={ry + SWATCH_SIZE - 2}
              fontSize={FONT_SIZE}
              fill={muiTheme.palette.text.primary}
              style={NO_SELECT_STYLE}
            >
              {row.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
