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

import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { OptionsEditorProps } from '@perses-dev/plugin-system';
import { produce } from 'immer';
import { ReactElement, useCallback } from 'react';
import { ColumnsEditor } from '../../components/ColumnsEditor';
import {
  DEFAULT_COLUMN_HEADERS,
  DEFAULT_SILENCE_COLUMNS,
  SilenceColumnDefinition,
  SilenceColumnSortMode,
  SilenceFieldName,
  SilenceTableOptions,
  inferSortMode,
} from './silence-table-model';

const DEFAULT_FIELD_NAMES = new Set(DEFAULT_SILENCE_COLUMNS.map((c) => c.name));

const ALL_FIELDS: SilenceFieldName[] = [
  'status',
  'matchers',
  'createdBy',
  'startsAt',
  'endsAt',
  'duration',
  'comment',
  'updatedAt',
];

const FIELD_OPTIONS: SilenceFieldName[] = ALL_FIELDS.filter((f) => !DEFAULT_FIELD_NAMES.has(f));

const SORT_MODE_LABELS: Record<SilenceColumnSortMode, string> = {
  alphabetical: 'Alphabetical',
  date: 'Date (chronological)',
  status: 'Status (active > pending > expired)',
};

export function SilenceTableColumnsEditor(props: OptionsEditorProps<SilenceTableOptions>): ReactElement {
  const { value, onChange } = props;
  const columns = value.columns ?? [];

  const handleAddColumn = useCallback((): void => {
    onChange(
      produce(value, (draft) => {
        if (!draft.columns) draft.columns = [];
        draft.columns.push({ name: FIELD_OPTIONS[0] ?? 'updatedAt' });
      })
    );
  }, [value, onChange]);

  const handleRemoveColumn = useCallback(
    (index: number): void => {
      onChange(
        produce(value, (draft) => {
          draft.columns?.splice(index, 1);
        })
      );
    },
    [value, onChange]
  );

  const handleUpdateColumn = useCallback(
    (index: number, updater: (draft: SilenceColumnDefinition) => void): void => {
      onChange(
        produce(value, (draft) => {
          const column = draft.columns?.[index];
          if (column) {
            updater(column);
          }
        })
      );
    },
    [value, onChange]
  );

  const handleMoveUp = useCallback(
    (index: number): void => {
      if (index <= 0) return;
      onChange(
        produce(value, (draft) => {
          if (!draft.columns) return;
          const item = draft.columns.splice(index, 1)[0]!;
          draft.columns.splice(index - 1, 0, item);
        })
      );
    },
    [value, onChange]
  );

  const handleMoveDown = useCallback(
    (index: number): void => {
      onChange(
        produce(value, (draft) => {
          if (!draft.columns || index >= draft.columns.length - 1) return;
          const item = draft.columns.splice(index, 1)[0]!;
          draft.columns.splice(index + 1, 0, item);
        })
      );
    },
    [value, onChange]
  );

  return (
    <ColumnsEditor<SilenceColumnDefinition>
      columns={columns}
      description="Status and Matchers are always shown. Add extra columns below."
      sortModeLabels={SORT_MODE_LABELS}
      defaultSortMode="alphabetical"
      getDisplayName={(col) => col.header || DEFAULT_COLUMN_HEADERS[col.name] || 'New column'}
      getHeaderPlaceholder={(col) => DEFAULT_COLUMN_HEADERS[col.name] || 'Column header'}
      onAdd={handleAddColumn}
      onRemove={handleRemoveColumn}
      onUpdate={handleUpdateColumn}
      onMoveUp={handleMoveUp}
      onMoveDown={handleMoveDown}
      renderNameField={(col, index, onUpdate) => (
        <FormControl size="small" fullWidth>
          <InputLabel id={`field-name-label-${index}`}>Field</InputLabel>
          <Select
            labelId={`field-name-label-${index}`}
            value={col.name}
            onChange={(e) =>
              onUpdate(index, (draft) => {
                const field = e.target.value as SilenceFieldName;
                draft.name = field;
                draft.sortMode = inferSortMode(field);
              })
            }
            label="Field"
          >
            {FIELD_OPTIONS.map((field) => (
              <MenuItem key={field} value={field}>
                {DEFAULT_COLUMN_HEADERS[field]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    />
  );
}
