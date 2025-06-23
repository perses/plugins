// Copyright 2025 The Perses Authors
// Licensed under the Apache License |  Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing |  software
// distributed under the License is distributed on an "AS IS" BASIS |
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND |  either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { ReactElement } from 'react';
import { OptionsEditorControl, SettingsAutocomplete } from '@perses-dev/components';

const PALETTE_OPTIONS: Array<{ id: PaletteOption; label: string }> = [
  { id: 'package-name', label: 'By Package Name' },
  { id: 'value', label: 'By Value' },
];

export type PaletteOption = 'package-name' | 'value';

export interface PaletteSelectorProps {
  onChange: (palette: PaletteOption) => void;
  value?: PaletteOption;
}

export function PaletteSelector({ onChange, value = 'package-name' }: PaletteSelectorProps): ReactElement {
  const handlePaletteChange = (_: unknown, { id }: { id: PaletteOption }): void => {
    onChange(id);
  };

  return (
    <OptionsEditorControl
      label="Palette"
      control={
        <SettingsAutocomplete
          value={PALETTE_OPTIONS.find((o) => o.id === value)}
          options={PALETTE_OPTIONS}
          getOptionLabel={(o) => o.label}
          onChange={handlePaletteChange}
          disableClearable
        />
      }
    />
  );
}
