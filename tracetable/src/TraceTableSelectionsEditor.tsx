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

import { OptionsEditorProps, SelectionOptions, SelectionOptionsEditor } from '@perses-dev/plugin-system';
import { ReactElement } from 'react';
import { TraceTableOptions } from './trace-table-model';

type TraceTableSelectionsEditorProps = OptionsEditorProps<TraceTableOptions>;

export function TraceTableSelectionsEditor(props: TraceTableSelectionsEditorProps): ReactElement {
  const { onChange, value } = props;

  const handleSelectionChange = (selection?: SelectionOptions): void => {
    onChange({ ...value, selection });
  };

  return <SelectionOptionsEditor value={value.selection} onChange={handleSelectionChange} />;
}
