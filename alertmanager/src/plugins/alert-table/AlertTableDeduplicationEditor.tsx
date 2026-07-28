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

import { Autocomplete, Chip, FormControl, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material';
import { OptionsEditorGroup } from '@perses-dev/components';
import { OptionsEditorProps } from '@perses-dev/plugin-system';
import { produce } from 'immer';
import { ReactElement, SyntheticEvent, useCallback } from 'react';
import { AlertDeduplicationConfig, AlertTableOptions } from './alert-table-model';

const MODE_DESCRIPTIONS: Record<AlertDeduplicationConfig['mode'], string> = {
  none: 'No deduplication. All alerts from all datasources are shown as-is.',
  fingerprint: 'Alerts with the same fingerprint from different datasources are merged. This is the default.',
  labels: 'Alerts are considered duplicates when all specified label values match.',
};

export function AlertTableDeduplicationEditor(props: OptionsEditorProps<AlertTableOptions>): ReactElement {
  const { value, onChange } = props;
  const dedup = value.deduplication ?? { mode: 'fingerprint' as const };

  const handleModeChange = useCallback(
    (mode: AlertDeduplicationConfig['mode']): void => {
      onChange(
        produce(value, (draft) => {
          draft.deduplication = { mode };
          if (mode === 'labels') {
            draft.deduplication.labels = draft.deduplication.labels ?? [];
          }
        })
      );
    },
    [value, onChange]
  );

  const handleLabelsChange = useCallback(
    (_event: SyntheticEvent, newLabels: string[]): void => {
      onChange(
        produce(value, (draft) => {
          if (!draft.deduplication) {
            draft.deduplication = { mode: 'labels' };
          }
          draft.deduplication.labels = newLabels.length > 0 ? newLabels : undefined;
        })
      );
    },
    [value, onChange]
  );

  return (
    <>
      <OptionsEditorGroup title="Mode">
        <FormControl size="small" fullWidth>
          <InputLabel id="dedup-mode-label">Deduplication Mode</InputLabel>
          <Select
            labelId="dedup-mode-label"
            value={dedup.mode}
            label="Deduplication Mode"
            onChange={(e) => handleModeChange(e.target.value as AlertDeduplicationConfig['mode'])}
          >
            <MenuItem value="none">None</MenuItem>
            <MenuItem value="fingerprint">Fingerprint</MenuItem>
            <MenuItem value="labels">Labels</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {MODE_DESCRIPTIONS[dedup.mode]}
        </Typography>
      </OptionsEditorGroup>
      {dedup.mode === 'labels' && (
        <OptionsEditorGroup title="Deduplication Labels">
          <Autocomplete<string, true, false, true>
            multiple
            freeSolo
            options={[] as string[]}
            value={dedup.labels ?? []}
            onChange={handleLabelsChange}
            renderTags={(tagValues, getTagProps): ReactElement[] =>
              tagValues.map((option, index) => {
                const { key, ...rest } = getTagProps({ index });
                return <Chip key={key} label={option} size="small" variant="outlined" {...rest} />;
              })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="Type a label key and press Enter"
                helperText="Alerts with identical values for all listed labels are considered duplicates."
              />
            )}
          />
        </OptionsEditorGroup>
      )}
    </>
  );
}
