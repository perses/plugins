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
import { NodeSizeSettings } from './NodeSizeSettings';

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
  onEdgeThresholdsChange: (thresholds: ThresholdOptions | undefined) => void;
  /** Whether the data-driven ("From data") mode is active. */
  isDataMode: boolean;
}

// The appearance controls shared by both the manual and data-driven tabs. Rendering the same block
// in each tab keeps every adjustment option close together instead of split between a top section
// and the tab contents.
function StylingSettings({
  value,
  onChange,
  onFormatChange,
  onThresholdsChange,
  onEdgeThresholdsChange,
  isDataMode,
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
        {/* Node size scaling only applies to generated nodes (which opt into `sizeMode: 'threshold'`);
            manually authored nodes have no size-mode control, so these inputs would have no effect in
            Manual mode. Show them only in From data mode. */}
        {isDataMode ? (
          <OptionsEditorGroup title="Node size">
            <NodeSizeSettings value={value} onChange={onChange} />
          </OptionsEditorGroup>
        ) : null}
      </OptionsEditorColumn>
      <OptionsEditorColumn>
        <OptionsEditorGroup title="Edge color">
          <ThresholdsEditor hideDefault thresholds={value.edgeThresholds} onChange={onEdgeThresholdsChange} />
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
      // The per-threshold node-size multipliers are keyed by threshold value. When a color threshold
      // is moved or removed, drop any multiplier whose value no longer matches a step so it cannot
      // linger as an active-but-hidden scale in the panel while disappearing from the editor.
      const nodeStepValues = new Set(thresholds?.steps?.map((step) => step.value));
      const nodeThresholdSizes = value.nodeThresholdSizes?.filter((size) => nodeStepValues.has(size.value));
      // Edge widths key off the effective edge thresholds, which fall back to these node thresholds
      // when no edge thresholds are set — so reconcile them here too.
      const edgeStepValues = new Set((value.edgeThresholds ?? thresholds)?.steps?.map((step) => step.value));
      const edgeThresholdWidths = value.edgeThresholdWidths?.filter((width) => edgeStepValues.has(width.value));
      onChange({
        ...value,
        thresholds,
        nodeThresholdSizes: nodeThresholdSizes?.length ? nodeThresholdSizes : undefined,
        edgeThresholdWidths: edgeThresholdWidths?.length ? edgeThresholdWidths : undefined,
      });
    },
    [value, onChange],
  );

  const onEdgeThresholdsChange = useCallback(
    (edgeThresholds: ThresholdOptions | undefined): void => {
      // Edge thickness breakpoints key off the effective edge thresholds (edge thresholds, or the
      // node thresholds when edge thresholds are cleared). Drop any width whose value no longer
      // matches a step so it cannot linger as an active-but-hidden width in the panel.
      const edgeStepValues = new Set((edgeThresholds ?? value.thresholds)?.steps?.map((step) => step.value));
      const edgeThresholdWidths = value.edgeThresholdWidths?.filter((width) => edgeStepValues.has(width.value));
      onChange({
        ...value,
        edgeThresholds,
        edgeThresholdWidths: edgeThresholdWidths?.length ? edgeThresholdWidths : undefined,
      });
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
        onEdgeThresholdsChange={onEdgeThresholdsChange}
        isDataMode={mode === 'auto'}
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
