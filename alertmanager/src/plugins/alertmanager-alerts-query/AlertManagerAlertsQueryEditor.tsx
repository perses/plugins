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

import { Checkbox, FormControl, FormControlLabel, Stack } from '@mui/material';
import { useId } from '@perses-dev/components';
import { DatasourceSelect, DatasourceSelectProps } from '@perses-dev/plugin-system';
import { produce } from 'immer';
import { ReactElement, useCallback } from 'react';
import { LazyTextField } from '../../components/LazyTextField';
import {
  ALERTMANAGER_DATASOURCE_KIND,
  DEFAULT_ALERTMANAGER,
  isAlertManagerDatasourceSelector,
  isDefaultAlertManagerSelector,
} from '../../model';
import { AlertManagerAlertsQuerySpec } from '../types';

interface AlertManagerAlertsQueryEditorProps {
  value: AlertManagerAlertsQuerySpec;
  onChange: (next: AlertManagerAlertsQuerySpec) => void;
}

export function AlertManagerAlertsQueryEditor(props: AlertManagerAlertsQueryEditorProps): ReactElement {
  const { onChange, value } = props;
  const datasourceSelectValue = value.datasource ?? DEFAULT_ALERTMANAGER;
  const datasourceSelectLabelID = useId('alertmanager-datasource-label');

  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (next) => {
    if (isAlertManagerDatasourceSelector(next)) {
      onChange(
        produce(value, (draft) => {
          draft.datasource = isDefaultAlertManagerSelector(next) ? undefined : next;
        })
      );
      return;
    }

    throw new Error('Got unexpected non-AlertManager datasource selector');
  };

  const handleFiltersChange = useCallback(
    (filtersText: string): void => {
      onChange(
        produce(value, (draft) => {
          draft.filters = filtersText
            .split('\n')
            .map((f) => f.trim())
            .filter((f) => f !== '');
        })
      );
    },
    [onChange, value]
  );

  const handleBooleanChange = useCallback(
    (field: 'active' | 'silenced' | 'inhibited' | 'unprocessed', checked: boolean): void => {
      onChange(
        produce(value, (draft) => {
          draft[field] = checked;
        })
      );
    },
    [onChange, value]
  );

  const handleReceiverChange = useCallback(
    (receiver: string): void => {
      onChange(
        produce(value, (draft) => {
          draft.receiver = receiver.trim() === '' ? undefined : receiver.trim();
        })
      );
    },
    [onChange, value]
  );

  return (
    <Stack spacing={2}>
      <FormControl margin="dense" fullWidth={false}>
        <DatasourceSelect
          datasourcePluginKind={ALERTMANAGER_DATASOURCE_KIND}
          value={datasourceSelectValue}
          onChange={handleDatasourceChange}
          labelId={datasourceSelectLabelID}
          label="Alert Manager Datasource"
          notched
        />
      </FormControl>
      <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={value.active ?? true}
              onChange={(e) => handleBooleanChange('active', e.target.checked)}
            />
          }
          label="Active"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={value.silenced ?? false}
              onChange={(e) => handleBooleanChange('silenced', e.target.checked)}
            />
          }
          label="Silenced"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={value.inhibited ?? false}
              onChange={(e) => handleBooleanChange('inhibited', e.target.checked)}
            />
          }
          label="Inhibited"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={value.unprocessed ?? false}
              onChange={(e) => handleBooleanChange('unprocessed', e.target.checked)}
            />
          }
          label="Unprocessed"
        />
      </Stack>
      <LazyTextField
        label="Receiver"
        value={value.receiver}
        onCommit={handleReceiverChange}
        placeholder="e.g. team-a"
      />
      <LazyTextField
        label="Filters (one per line)"
        value={(value.filters ?? []).join('\n')}
        onCommit={handleFiltersChange}
        placeholder={'alertname="HighMemory"\nseverity="critical"\nenvironment=~"${env:pipe}"'}
        helperText="PromQL-style matchers, one per line."
        multiline
        minRows={3}
      />
    </Stack>
  );
}
