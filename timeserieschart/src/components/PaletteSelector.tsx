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

import { OptionsEditorControl, SettingsAutocomplete, useChartsTheme } from '@perses-dev/components';
import type { SettingsAutocompleteOption } from '@perses-dev/components';
import type { ReactElement, SyntheticEvent } from 'react';
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

interface PaletteOption extends SettingsAutocompleteOption {
  paletteMode: 'auto' | 'categorical';
  paletteName?: CategoricalPaletteName;
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
        paletteMode: 'auto',
      },
      {
        id: 'theme-colors',
        label: 'Theme colors',
        description: themeColors.length > 0 ? <ColorSwatches colors={themeColors} /> : undefined,
        paletteMode: 'categorical',
      },
      ...CATEGORICAL_PALETTE_NAMES.map((name): PaletteOption => {
        const meta = CATEGORICAL_SCHEME_METADATA[name];
        const colors = CATEGORICAL_PALETTE_SCHEMES[name];
        return {
          id: `categorical-${name}`,
          label: meta.label,
          description: <ColorSwatches colors={colors} />,
          paletteMode: 'categorical',
          paletteName: name,
        };
      }),
    ];
  }, [themePalette]);

  const currentPaletteOption = useMemo((): PaletteOption => {
    if (value?.mode !== 'categorical') {
      return paletteOptions.find((o) => o.id === 'auto')!;
    }
    const name = value.name;
    if (!name) {
      return paletteOptions.find((o) => o.id === 'theme-colors')!;
    }
    return paletteOptions.find((o) => o.paletteName === name) ?? paletteOptions.find((o) => o.id === 'theme-colors')!;
  }, [value, paletteOptions]);

  const handleChange = useCallback(
    (_: SyntheticEvent, selected: PaletteOption): void => {
      if (selected.paletteMode === 'auto') {
        onChange({ mode: 'auto' });
      } else {
        onChange({
          mode: 'categorical',
          name: selected.paletteName,
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
          onChange={handleChange}
          disableClearable
        />
      }
    />
  );
}
