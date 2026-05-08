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

import { Checkbox, FormControlLabel } from '@mui/material';
import { OptionsEditorGroup } from '@perses-dev/components';
import { OptionsEditorProps } from '@perses-dev/plugin-system';
import { produce } from 'immer';
import { ReactElement, useCallback } from 'react';
import { ALL_SILENCE_ACTIONS, SilenceAction, SilenceTableOptions } from './silence-table-model';

const ACTION_LABELS: Record<SilenceAction, string> = {
  expire: 'Expire silence',
};

export function SilenceTableOptionsEditor(props: OptionsEditorProps<SilenceTableOptions>): ReactElement {
  const { value, onChange } = props;
  const effectiveActions = value.allowedActions ?? ALL_SILENCE_ACTIONS;

  const handleToggle = useCallback(
    (action: SilenceAction, checked: boolean) => {
      onChange(
        produce(value, (draft) => {
          const current = draft.allowedActions ?? [...ALL_SILENCE_ACTIONS];
          if (checked) {
            if (!current.includes(action)) current.push(action);
          } else {
            const idx = current.indexOf(action);
            if (idx >= 0) current.splice(idx, 1);
          }
          draft.allowedActions = current;
        })
      );
    },
    [value, onChange]
  );

  return (
    <OptionsEditorGroup title="Actions">
      {ALL_SILENCE_ACTIONS.map((action) => (
        <FormControlLabel
          key={action}
          control={
            <Checkbox
              checked={effectiveActions.includes(action)}
              onChange={(e) => handleToggle(action, e.target.checked)}
              size="small"
            />
          }
          label={ACTION_LABELS[action]}
        />
      ))}
    </OptionsEditorGroup>
  );
}
