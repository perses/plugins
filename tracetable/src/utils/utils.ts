// Copyright 2024 The Perses Authors
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

import { PersesChartsTheme } from '@perses-dev/components';
import { Theme } from '@mui/material';
import { getConsistentCategoricalColor, getConsistentColor } from './palette';

export function getServiceColor(
  muiTheme: Theme,
  chartsTheme: PersesChartsTheme,
  paletteMode: 'auto' | 'categorical' | undefined,
  serviceName: string,
  error = false
): string {
  switch (paletteMode) {
    case 'categorical': {
      // ECharts type for color is not always an array but it is always an array in ChartsProvider
      const categoricalPalette = chartsTheme.echartsTheme.color as string[];
      const errorPalette = [muiTheme.palette.error.light, muiTheme.palette.error.main, muiTheme.palette.error.dark];
      return getConsistentCategoricalColor(serviceName, error, categoricalPalette, errorPalette);
    }

    default:
      return getConsistentColor(serviceName, error);
  }
}
