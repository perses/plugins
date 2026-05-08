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

import { Autocomplete, Checkbox, Chip, FormControlLabel, TextField } from '@mui/material';
import { OptionsEditorGroup } from '@perses-dev/components';
import { OptionsEditorProps } from '@perses-dev/plugin-system';
import { produce } from 'immer';
import { ReactElement, SyntheticEvent, useCallback } from 'react';
import { AlertAction, AlertTableOptions, ALL_ALERT_ACTIONS } from './alert-table-model';

const ACTION_LABELS: Record<AlertAction, string> = {
  silence: 'Silence alert',
  runbook: 'View runbook',
};

export function AlertTableOptionsEditor(props: OptionsEditorProps<AlertTableOptions>): ReactElement {
  const { value, onChange } = props;
  const effectiveActions = value.allowedActions ?? ALL_ALERT_ACTIONS;
  const groupBy = value.defaultGroupBy ?? ['alertname'];

  const handleGroupByChange = useCallback(
    (_event: SyntheticEvent, newValue: string[]): void => {
      onChange(
        produce(value, (draft) => {
          draft.defaultGroupBy = newValue.length > 0 ? newValue : undefined;
        })
      );
    },
    [value, onChange]
  );

  const handleToggle = useCallback(
    (action: AlertAction, checked: boolean) => {
      onChange(
        produce(value, (draft) => {
          const current = draft.allowedActions ?? [...ALL_ALERT_ACTIONS];
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
    <>
      <OptionsEditorGroup title="Group By">
        <Autocomplete<string, true, false, true>
          multiple
          freeSolo
          options={[] as string[]}
          value={groupBy}
          onChange={handleGroupByChange}
          renderTags={(tagValues, getTagProps): ReactElement[] =>
            tagValues.map((option, index) => {
              const { key, ...rest } = getTagProps({ index });
              const isVariable = option.includes('$');
              return (
                <Chip
                  key={key}
                  label={option}
                  size="small"
                  variant={isVariable ? 'filled' : 'outlined'}
                  color={isVariable ? 'primary' : 'default'}
                  {...rest}
                />
              );
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              placeholder="Type a label key or $variable and press Enter"
              helperText="Label keys to group alerts by. Supports $variable interpolation."
            />
          )}
        />
      </OptionsEditorGroup>
      <OptionsEditorGroup title="Actions">
        {ALL_ALERT_ACTIONS.map((action) => (
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
    </>
  );
}
