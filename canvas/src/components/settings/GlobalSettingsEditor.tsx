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

import {
  FormatControls,
  OptionsEditorColumn,
  OptionsEditorGrid,
  OptionsEditorGroup,
  ThresholdsEditor,
} from '@perses-dev/components';
import { OptionsEditorProps } from '@perses-dev/plugin-system';
import { ReactElement } from 'react';
import { Box } from '@mui/material';
import { CanvasSpec } from '../../model';
import { EditorStateProvider } from '../../contexts/EditorContext';
import { SpecProvider } from '../../contexts/SpecContext';
import { EditorItemsPanel } from '../editor/EditorItemsPanel';
import { LegendSettings } from './LegendSettings';
import { EdgeThicknessSettings } from './EdgeThicknessSettings';

type GlobalSettingsEditorProps = OptionsEditorProps<CanvasSpec>;

export function GlobalSettingsEditor({ value, onChange }: GlobalSettingsEditorProps): ReactElement {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <OptionsEditorGrid>
        <OptionsEditorColumn>
          <OptionsEditorGroup title="Legend">
            <LegendSettings value={value} onChange={onChange} />
          </OptionsEditorGroup>
          <OptionsEditorGroup title="Format">
            <FormatControls
              value={value.format ?? { unit: 'decimal' }}
              onChange={(format) => onChange({ ...value, format })}
            />
          </OptionsEditorGroup>
        </OptionsEditorColumn>
        <OptionsEditorColumn>
          <ThresholdsEditor
            hideDefault
            thresholds={value.thresholds}
            onChange={(thresholds) => onChange({ ...value, thresholds })}
          />
          <OptionsEditorGroup title="Edge thickness">
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
