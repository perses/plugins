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

import type { ActionOptions, SelectionOptions } from '@perses-dev/plugin-system';
import { ItemSelectionActionsEditor } from '@perses-dev/plugin-system';
import type { ReactElement } from 'react';
import { useCallback } from 'react';

import type { TracingGanttChartOptionsEditorProps } from './gantt-chart-model';

export function TracingGanttChartItemSelectionActionsEditor(props: TracingGanttChartOptionsEditorProps): ReactElement {
  const { onChange, value } = props;

  const handleActionsChange = useCallback(
    (actions?: ActionOptions): void => onChange({ ...value, actions }),
    [onChange, value],
  );

  const handleSelectionChange = useCallback(
    (selection?: SelectionOptions): void => onChange({ ...value, selection }),
    [onChange, value],
  );

  return (
    <ItemSelectionActionsEditor
      actionOptions={value.actions}
      onChangeActions={handleActionsChange}
      selectionOptions={value.selection}
      onChangeSelection={handleSelectionChange}
    />
  );
}
