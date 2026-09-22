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

import { Box, Slider, Stack, Typography } from '@mui/material';
import type { ReactElement, SyntheticEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';

const MIN_RADIUS = 0;
const MAX_RADIUS = 100;
const RADIUS_MARKS = [
  { value: MIN_RADIUS, label: '0%' },
  { value: MAX_RADIUS, label: '100%' },
];
const RADIUS_SLIDER_CONTAINER_SX = { px: 3 };

function getRadiusSliderAriaLabel(index: number): string {
  return index === 0 ? 'Inner Radius slider' : 'Outer Radius slider';
}

function formatRadiusSliderValue(value: number, index: number): string {
  return `${index === 0 ? 'Inner' : 'Outer'}: ${value}%`;
}

export interface PieChartRadiusValues {
  innerRadius?: number;
  outerRadius: number;
}

type RadiusRange = [number, number];

export interface PieChartRadiusControlProps extends PieChartRadiusValues {
  onChange: (radius: PieChartRadiusValues) => void;
}

function toRadiusValues(range: RadiusRange): PieChartRadiusValues {
  return {
    innerRadius: range[0] === MIN_RADIUS ? undefined : range[0],
    outerRadius: range[1],
  };
}

function toRadiusRange(newValue: number | number[]): RadiusRange | undefined {
  if (!Array.isArray(newValue) || newValue.length < 2) return undefined;

  return [newValue[0] ?? MIN_RADIUS, newValue[1] ?? MAX_RADIUS];
}

export function PieChartRadiusControl({
  innerRadius,
  outerRadius,
  onChange,
}: PieChartRadiusControlProps): ReactElement {
  const [radiusDraft, setRadiusDraft] = useState<RadiusRange>();
  const radiusRange = useMemo<RadiusRange>(
    () => radiusDraft ?? [innerRadius ?? MIN_RADIUS, outerRadius],
    [innerRadius, outerRadius, radiusDraft],
  );

  const commitRadius = useCallback(
    (nextRadius: PieChartRadiusValues): void => {
      setRadiusDraft(undefined);
      onChange(nextRadius);
    },
    [onChange],
  );

  const handleRadiusSliderChange = useCallback((_: Event, newValue: number | number[]): void => {
    const nextRange = toRadiusRange(newValue);
    if (nextRange) setRadiusDraft(nextRange);
  }, []);

  const handleRadiusSliderCommit = useCallback(
    (_: Event | SyntheticEvent, newValue: number | number[]): void => {
      if (!Array.isArray(newValue) || newValue.length < 2) return;

      const nextRange = toRadiusRange(newValue);
      if (nextRange) commitRadius(toRadiusValues(nextRange));
    },
    [commitRadius],
  );

  return (
    <Stack spacing={1}>
      <Typography variant="body2">Radius</Typography>
      <Box sx={RADIUS_SLIDER_CONTAINER_SX}>
        <Slider
          min={MIN_RADIUS}
          max={MAX_RADIUS}
          marks={RADIUS_MARKS}
          step={1}
          value={radiusRange}
          valueLabelDisplay="auto"
          getAriaLabel={getRadiusSliderAriaLabel}
          getAriaValueText={formatRadiusSliderValue}
          valueLabelFormat={formatRadiusSliderValue}
          onChange={handleRadiusSliderChange}
          onChangeCommitted={handleRadiusSliderCommit}
        />
      </Box>
    </Stack>
  );
}
