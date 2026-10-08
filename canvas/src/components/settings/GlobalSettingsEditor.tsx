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

import { Box, IconButton } from '@mui/material';
import type { FormatOptions, ThresholdOptions } from '@perses-dev/components';
import {
  FormatControls,
  InfoTooltip,
  OptionsEditorColumn,
  OptionsEditorGrid,
  OptionsEditorGroup,
  ThresholdsEditor,
} from '@perses-dev/components';
import type { OptionsEditorProps } from '@perses-dev/plugin-system';
import InformationOutlineIcon from 'mdi-material-ui/InformationOutline';
import type { ReactElement } from 'react';
import { useCallback } from 'react';

import { EditorStateProvider } from '../../contexts/EditorContext';
import { SpecProvider } from '../../contexts/SpecContext';
import type { CanvasSpec } from '../../model';
import { EditorItemsPanel } from '../editor/EditorItemsPanel';
import { EdgeThicknessSettings } from './EdgeThicknessSettings';
import { LegendSettings } from './LegendSettings';

const DEFAULT_FORMAT: FormatOptions = { unit: 'decimal' };
const EDITOR_COLUMN_SX = { display: 'flex', flexDirection: 'column' as const, gap: 3 };
const EDGE_THICKNESS_INFO_ICON = (
  <InfoTooltip
    id="edge-thickness-info-tooltip"
    title="Edge thickness"
    description="When an edge has a query and its thickness mode is set to Threshold, its width follows the latest value of that query: the width of the highest matching threshold step is used. The default width applies otherwise (fixed mode without a custom width, no data, or no matching step)."
    enterDelay={100}
  >
    <IconButton
      aria-label="Edge thickness information"
      aria-describedby="edge-thickness-info-tooltip"
      size="small"
      sx={{ borderRadius: 1, padding: '4px', margin: '0 2px' }}
    >
      <InformationOutlineIcon aria-hidden fontSize="inherit" sx={{ color: 'text.secondary' }} />
    </IconButton>
  </InfoTooltip>
);

type GlobalSettingsEditorProps = OptionsEditorProps<CanvasSpec>;

export function GlobalSettingsEditor({ value, onChange }: GlobalSettingsEditorProps): ReactElement {
  const onFormatChange = useCallback(
    (format: FormatOptions): void => {
      onChange({ ...value, format });
    },
    [value, onChange],
  );

  const onThresholdsChange = useCallback(
    (thresholds: ThresholdOptions | undefined): void => {
      onChange({ ...value, thresholds });
    },
    [value, onChange],
  );

  return (
    <Box sx={EDITOR_COLUMN_SX}>
      <OptionsEditorGrid>
        <OptionsEditorColumn>
          <OptionsEditorGroup title="Legend">
            <LegendSettings value={value} onChange={onChange} />
          </OptionsEditorGroup>
          <OptionsEditorGroup title="Format">
            <FormatControls value={value.format ?? DEFAULT_FORMAT} onChange={onFormatChange} />
          </OptionsEditorGroup>
        </OptionsEditorColumn>
        <OptionsEditorColumn>
          <ThresholdsEditor hideDefault thresholds={value.thresholds} onChange={onThresholdsChange} />
          <OptionsEditorGroup title="Edge thickness" icon={EDGE_THICKNESS_INFO_ICON}>
            <EdgeThicknessSettings value={value} onChange={onChange} />
          </OptionsEditorGroup>
        </OptionsEditorColumn>
      </OptionsEditorGrid>

      <OptionsEditorGroup title="Items">
        <EditorStateProvider>
          <SpecProvider spec={value} onChange={onChange}>
            <EditorItemsPanel />
          </SpecProvider>
        </EditorStateProvider>
      </OptionsEditorGroup>
    </Box>
  );
}
