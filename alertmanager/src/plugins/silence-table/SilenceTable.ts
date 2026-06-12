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
import { SilenceTableColumnsEditor } from './SilenceTableColumnsEditor';
import { SilenceTableOptionsEditor } from './SilenceTableOptionsEditor';
import { SilenceTablePanel } from './SilenceTablePanel';
import { SilenceTableOptions } from './silence-table-model';

/**
 * Panel plugin for displaying Alert Manager silences in a table.
 */
export const SilenceTable: PanelPlugin<SilenceTableOptions> = {
  PanelComponent: SilenceTablePanel as PanelPlugin<SilenceTableOptions>['PanelComponent'],
  supportedQueryTypes: ['SilencesQuery'],
  panelOptionsEditorComponents: [
    { label: 'General', content: SilenceTableOptionsEditor },
    { label: 'Columns', content: SilenceTableColumnsEditor },
  ],
  createInitialOptions: () => ({}),
};
