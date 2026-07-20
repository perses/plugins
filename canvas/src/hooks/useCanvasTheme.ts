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
import { useChartsTheme } from '@perses-dev/components';

export interface CanvasTheme {
  palette: string[];
  selection: string;
  connection: string;
  snapHighlight: string;
  background: string;
  divider: string;
  text: string;
  labelBackground: string;
  labelBorder: string;
  labelText: string;
  nodeStroke: string;
  nodeDefaultFill: string;
}

export function useCanvasTheme(): CanvasTheme {
  const muiTheme = useTheme();
  const chartsTheme = useChartsTheme();
  return {
    palette: chartsTheme.thresholds.palette,
    selection: muiTheme.palette.warning.main,
    connection: muiTheme.palette.info.main,
    snapHighlight: muiTheme.palette.success.main,
    background: muiTheme.palette.background.paper,
    divider: muiTheme.palette.divider,
    text: muiTheme.palette.text.primary,
    labelBackground: muiTheme.palette.background.paper,
    labelBorder: muiTheme.palette.divider,
    labelText: muiTheme.palette.text.primary,
    nodeStroke: muiTheme.palette.background.paper,
    nodeDefaultFill: muiTheme.palette.primary.main,
  };
}
