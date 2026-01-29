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

import { PanelPlugin } from '@perses-dev/plugin-system';
import { TraceTablePanel, TraceTablePanelProps } from './TraceTablePanel';
import { TraceTableItemActionsEditor } from './TraceTableItemActionsEditor';
import { TraceTableSelectionsEditor } from './TraceTableSelectionsEditor';
import { TraceTableOptions, createInitialTraceTableOptions } from './trace-table-model';

/**
 * The core TraceTable panel plugin for Perses.
 */
export const TraceTable: PanelPlugin<TraceTableOptions, TraceTablePanelProps> = {
  PanelComponent: TraceTablePanel,
  OptionsEditorComponent: TraceTableSelectionsEditor,
  panelOptionsEditorComponents: [
    { label: 'Selections', content: TraceTableSelectionsEditor },
    { label: 'Item Actions', content: TraceTableItemActionsEditor },
  ],
  supportedQueryTypes: ['TraceQuery'],
  createInitialOptions: createInitialTraceTableOptions,
};
