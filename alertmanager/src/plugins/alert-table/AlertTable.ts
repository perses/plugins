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
import { AlertTableColumnsEditor } from './AlertTableColumnsEditor';
import { AlertTableDeduplicationEditor } from './AlertTableDeduplicationEditor';
import { AlertTableLabelsEditor } from './AlertTableLabelsEditor';
import { AlertTableOptionsEditor } from './AlertTableOptionsEditor';
import { AlertTablePanel, AlertTablePanelProps } from './AlertTablePanel';
import { AlertTableOptions } from './alert-table-model';

/**
 * Panel plugin for displaying Alert Manager alerts in a hierarchical table.
 */
export const AlertTable: PanelPlugin<AlertTableOptions, AlertTablePanelProps> = {
  PanelComponent: AlertTablePanel,
  supportedQueryTypes: ['AlertsQuery'],
  panelOptionsEditorComponents: [
    { label: 'General', content: AlertTableOptionsEditor },
    { label: 'Columns', content: AlertTableColumnsEditor },
    { label: 'Labels', content: AlertTableLabelsEditor },
    { label: 'Deduplication', content: AlertTableDeduplicationEditor },
  ],
  createInitialOptions: () => ({
    defaultGroupBy: ['alertname'],
  }),
};
