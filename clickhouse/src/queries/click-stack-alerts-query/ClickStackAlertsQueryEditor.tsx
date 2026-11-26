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

import { Autocomplete, Stack, TextField } from '@mui/material';
import type { DatasourceSelectProps, OptionsEditorProps } from '@perses-dev/plugin-system';
import { DatasourceSelect } from '@perses-dev/plugin-system';
import type { ReactElement } from 'react';

import { DraftTextField } from '../../components/DraftTextField';
import type { ClickStackAlertSource, ClickStackAlertState } from '../../model/click-stack-client';
import {
  CLICKSTACK_DATASOURCE_KIND,
  DEFAULT_CLICKSTACK,
  isClickStackDatasourceSelectValue,
} from '../../model/click-stack-selectors';
import type { ClickStackAlertsQuerySpec } from './click-stack-alerts-query-types';
import { DEFAULT_ALERT_STATES } from './click-stack-alerts-query-types';

type ClickStackAlertsQueryEditorProps = OptionsEditorProps<ClickStackAlertsQuerySpec>;

// The states ClickStack sets, named as Perses displays them.
const STATE_LABELS: Partial<Record<ClickStackAlertState, string>> = {
  ALERT: 'Firing',
  PENDING: 'Pending',
  OK: 'OK',
};
const STATE_OPTIONS = Object.keys(STATE_LABELS) as ClickStackAlertState[];

const SOURCE_LABELS: Record<ClickStackAlertSource, string> = {
  saved_search: 'Saved searches',
  tile: 'Dashboard tiles',
  inline: 'Charts',
};
const SOURCE_OPTIONS = Object.keys(SOURCE_LABELS) as ClickStackAlertSource[];

const NO_TAGS: string[] = [];

function isDefaultStates(states: ClickStackAlertState[]): boolean {
  return states.length === DEFAULT_ALERT_STATES.length && DEFAULT_ALERT_STATES.every((state) => states.includes(state));
}

export function ClickStackAlertsQueryEditor(props: ClickStackAlertsQueryEditorProps): ReactElement {
  const { onChange, value, isReadonly } = props;

  const handleDatasourceChange: DatasourceSelectProps['onChange'] = (next) => {
    if (!isClickStackDatasourceSelectValue(next)) {
      throw new Error('Got unexpected non ClickStack datasource selection');
    }
    onChange({ ...value, datasource: next });
  };

  const handleStatesChange = (states: ClickStackAlertState[]): void => {
    // Without any state, or with the default ones, the spec is left without states: the default ones apply.
    onChange({ ...value, states: states.length === 0 || isDefaultStates(states) ? undefined : states });
  };

  return (
    <Stack spacing={1.5}>
      <DatasourceSelect
        datasourcePluginKind={CLICKSTACK_DATASOURCE_KIND}
        value={value.datasource ?? DEFAULT_CLICKSTACK}
        onChange={handleDatasourceChange}
        readOnly={isReadonly}
        label="ClickStack Datasource"
        notched
      />
      <Stack direction="row" spacing={1.5}>
        <Autocomplete
          multiple
          fullWidth
          size="small"
          readOnly={isReadonly}
          options={STATE_OPTIONS}
          getOptionLabel={(state) => STATE_LABELS[state] ?? state}
          value={value.states && value.states.length > 0 ? value.states : [...DEFAULT_ALERT_STATES]}
          onChange={(_event, states) => handleStatesChange(states)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="States"
              helperText="Alerts in one of these states. Firing and pending by default."
            />
          )}
        />
        <Autocomplete
          multiple
          fullWidth
          size="small"
          readOnly={isReadonly}
          options={SOURCE_OPTIONS}
          getOptionLabel={(source) => SOURCE_LABELS[source] ?? source}
          value={value.sources ?? []}
          onChange={(_event, sources) => onChange({ ...value, sources: sources.length > 0 ? sources : undefined })}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Sources"
              placeholder={value.sources?.length ? undefined : 'All'}
              slotProps={{ inputLabel: { ...params.InputLabelProps, shrink: true } }}
              helperText="What the alerts watch. All sources by default."
            />
          )}
        />
      </Stack>
      <Autocomplete
        multiple
        freeSolo
        // Adds the text being typed when the field loses the focus, as pressing Enter does.
        autoSelect
        fullWidth
        size="small"
        readOnly={isReadonly}
        options={NO_TAGS}
        value={value.tags ?? NO_TAGS}
        onChange={(_event, tags) => {
          const cleaned = [...new Set(tags.map((tag) => tag.trim()).filter((tag) => tag !== ''))];
          onChange({ ...value, tags: cleaned.length > 0 ? cleaned : undefined });
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Tags"
            placeholder={value.tags?.length ? undefined : 'All'}
            slotProps={{ inputLabel: { ...params.InputLabelProps, shrink: true } }}
            helperText="Alerts with one of these tags. Press Enter to add a tag. Variables are supported, e.g. team:$team."
          />
        )}
      />
      <DraftTextField
        label="Name"
        value={value.search}
        onChange={(search) => onChange({ ...value, search: search.trim() || undefined })}
        helperText="Alerts whose name contains this text. Variables are supported."
        isReadonly={isReadonly}
      />
    </Stack>
  );
}
