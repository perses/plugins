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

import { Tooltip } from '@mui/material';
import { OptionsEditorControl, SettingsAutocomplete, useChartsTheme } from '@perses-dev/components';
import type { HTMLAttributes, Key, ReactElement, ReactNode, SyntheticEvent } from 'react';
import { useCallback, useMemo } from 'react';

import type { CategoricalPaletteName, TimeSeriesChartPaletteOptions } from '../time-series-chart-model';
import {
  CATEGORICAL_PALETTE_NAMES,
  CATEGORICAL_PALETTE_SCHEMES,
  CATEGORICAL_SCHEME_METADATA,
  PALETTE_DROPDOWN_TOOLTIP,
  VISUAL_CONFIG,
} from '../time-series-chart-model';
import { ColorSwatches } from './ColorSwatches';

interface PaletteOption {
  id: string;
  label: string;
  swatches: ReactNode;
  paletteMode: 'auto' | 'categorical';
  paletteName?: CategoricalPaletteName;
}

const SWATCH_TOOLTIP_SLOT_PROPS = {
  tooltip: {
    sx: { bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', boxShadow: 2 },
  },
} as const;

function renderPaletteOption(
  { key, ...props }: HTMLAttributes<HTMLLIElement> & { key: Key },
  option: PaletteOption,
): ReactElement {
  if (option.swatches) {
    return (
      <Tooltip
        key={key}
        title={option.swatches}
        placement="right"
        enterDelay={100}
        slotProps={SWATCH_TOOLTIP_SLOT_PROPS}
      >
        <li {...props}>{option.label}</li>
      </Tooltip>
    );
  }
  return (
    <li key={key} {...props}>
      {option.label}
    </li>
  );
}

export interface PaletteSelectorProps {
  value: TimeSeriesChartPaletteOptions | undefined;
  onChange: (palette: TimeSeriesChartPaletteOptions | undefined) => void;
}

export function PaletteSelector({ value, onChange }: PaletteSelectorProps): ReactElement {
  const chartsTheme = useChartsTheme();
  const themePalette = chartsTheme.echartsTheme.color as string[] | undefined;

  const paletteOptions = useMemo((): PaletteOption[] => {
    const themeColors: string[] = Array.isArray(themePalette) && themePalette.length > 0 ? themePalette : [];
    return [
      {
        id: 'auto',
        label: 'Auto',
        swatches: null,
        paletteMode: 'auto',
      },
      {
        id: 'theme-colors',
        label: 'Theme colors',
        swatches: themeColors.length > 0 ? <ColorSwatches colors={themeColors} /> : null,
        paletteMode: 'categorical',
      },
      ...CATEGORICAL_PALETTE_NAMES.map((name): PaletteOption => {
        const meta = CATEGORICAL_SCHEME_METADATA[name];
        const colors = CATEGORICAL_PALETTE_SCHEMES[name];
        return {
          id: `categorical-${name}`,
          label: meta.label,
          swatches: <ColorSwatches colors={colors} />,
          paletteMode: 'categorical',
          paletteName: name,
        };
      }),
    ];
  }, [themePalette]);

  const currentPaletteOption = useMemo((): PaletteOption => {
    if (value?.mode !== 'categorical') {
      return paletteOptions[0]!;
    }
    const name = value.categoricalPaletteName;
    if (!name) {
      return paletteOptions[1]!;
    }
    return paletteOptions.find((o) => o.paletteName === name) ?? paletteOptions[1]!;
  }, [value, paletteOptions]);

  const handleChange = useCallback(
    (_: SyntheticEvent, selected: PaletteOption): void => {
      if (selected.paletteMode === 'auto') {
        onChange({ mode: 'auto' });
      } else {
        onChange({
          mode: 'categorical',
          categoricalPaletteName: selected.paletteName,
        });
      }
    },
    [onChange],
  );

  return (
    <OptionsEditorControl
      label={VISUAL_CONFIG.colorPalette.label}
      description={PALETTE_DROPDOWN_TOOLTIP}
      control={
        <SettingsAutocomplete
          value={currentPaletteOption}
          options={paletteOptions}
          getOptionLabel={(o) => o.label}
          renderOption={renderPaletteOption}
          onChange={handleChange}
          disableClearable
        />
      }
    />
  );
}
