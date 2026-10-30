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

import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import type { FormatOptions, ThresholdOptions } from '@perses-dev/components';
import {
  FormatControls,
  OptionsEditorColumn,
  OptionsEditorGrid,
  OptionsEditorGroup,
  ThresholdsEditor,
} from '@perses-dev/components';
import type { OptionsEditorProps } from '@perses-dev/plugin-system';
import type { MouseEvent, ReactElement } from 'react';
import { useCallback } from 'react';

import { EditorStateProvider } from '../../contexts/EditorContext';
import { SpecProvider } from '../../contexts/SpecContext';
import type { CanvasSpec, GraphGenerationSpec } from '../../model';
import { EditorItemsPanel } from '../editor/EditorItemsPanel';
import { EdgeThicknessSettings } from './EdgeThicknessSettings';
import { GraphGenerationSettings } from './GraphGenerationSettings';
import { LegendSettings } from './LegendSettings';

const DEFAULT_FORMAT: FormatOptions = { unit: 'decimal' };
const EDITOR_COLUMN_SX = { display: 'flex', flexDirection: 'column' as const, gap: 3 };
const MODE_TOGGLE_SX = { mb: 2 };
const DEFAULT_GENERATION: GraphGenerationSpec = { enabled: true, nodeQueryIndex: 0, nodeIdLabel: '' };

type GlobalSettingsEditorProps = OptionsEditorProps<CanvasSpec>;

interface StylingSettingsProps {
  value: CanvasSpec;
  onChange: (value: CanvasSpec) => void;
  onFormatChange: (format: FormatOptions) => void;
  onThresholdsChange: (thresholds: ThresholdOptions | undefined) => void;
}

// The appearance controls shared by both the manual and data-driven tabs. Rendering the same block
// in each tab keeps every adjustment option close together instead of split between a top section
// and the tab contents.
function StylingSettings({
  value,
  onChange,
  onFormatChange,
  onThresholdsChange,
}: StylingSettingsProps): ReactElement {
  return (
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
        <OptionsEditorGroup title="Node color">
          <ThresholdsEditor hideDefault thresholds={value.thresholds} onChange={onThresholdsChange} />
        </OptionsEditorGroup>
        <OptionsEditorGroup title="Edge thickness">
          <EdgeThicknessSettings value={value} onChange={onChange} />
        </OptionsEditorGroup>
      </OptionsEditorColumn>
    </OptionsEditorGrid>
  );
}

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

  const mode = value.graphGeneration?.enabled ? 'auto' : 'manual';

  const onModeChange = useCallback(
    (_: MouseEvent<HTMLElement>, next: 'manual' | 'auto' | null): void => {
      if (next === null) {
        return;
      }
      if (next === 'auto') {
        onChange({ ...value, graphGeneration: { ...DEFAULT_GENERATION, ...value.graphGeneration, enabled: true } });
      } else {
        onChange(
          value.graphGeneration ? { ...value, graphGeneration: { ...value.graphGeneration, enabled: false } } : value,
        );
      }
    },
    [value, onChange],
  );

  return (
    <Box sx={EDITOR_COLUMN_SX}>
      <ToggleButtonGroup exclusive size="small" value={mode} onChange={onModeChange} sx={MODE_TOGGLE_SX}>
        <ToggleButton value="manual">Manual</ToggleButton>
        <ToggleButton value="auto">From data</ToggleButton>
      </ToggleButtonGroup>

      {/* Each tab is self-contained: the same styling controls plus the tab's own item editor, so
          every adjustment option stays together within the active mode. */}
      <StylingSettings
        value={value}
        onChange={onChange}
        onFormatChange={onFormatChange}
        onThresholdsChange={onThresholdsChange}
      />

      <OptionsEditorGroup title="Items">
        {mode === 'auto' ? (
          <GraphGenerationSettings value={value} onChange={onChange} />
        ) : (
          <EditorStateProvider>
            <SpecProvider spec={value} onChange={onChange}>
              <EditorItemsPanel />
            </SpecProvider>
          </EditorStateProvider>
        )}
      </OptionsEditorGroup>
    </Box>
  );
}
