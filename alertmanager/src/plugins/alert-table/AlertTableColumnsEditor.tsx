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

import { TextField } from '@mui/material';
import { OptionsEditorProps } from '@perses-dev/plugin-system';
import { produce } from 'immer';
import { ReactElement, useCallback } from 'react';
import { ColumnsEditor } from '../../components/ColumnsEditor';
import { AlertTableOptions, ColumnDefinition, ColumnSortMode } from './alert-table-model';

const SORT_MODE_LABELS: Record<ColumnSortMode, string> = {
  alphabetical: 'Alphabetical',
  numeric: 'Numeric',
  severity: 'Severity (critical → other)',
};

export function AlertTableColumnsEditor(props: OptionsEditorProps<AlertTableOptions>): ReactElement {
  const { value, onChange } = props;
  const columns = value.columns ?? [];

  const handleAddColumn = useCallback((): void => {
    onChange(
      produce(value, (draft) => {
        if (!draft.columns) draft.columns = [];
        draft.columns.push({ name: 'severity' });
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
    (index: number, updater: (draft: ColumnDefinition) => void): void => {
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
    <ColumnsEditor<ColumnDefinition>
      columns={columns}
      description="Status and Alert Name are always shown. Add extra columns below."
      sortModeLabels={SORT_MODE_LABELS}
      defaultSortMode="alphabetical"
      getDisplayName={(col) => col.header || col.name || 'New column'}
      getHeaderPlaceholder={(col) => col.name || 'Column header'}
      onAdd={handleAddColumn}
      onRemove={handleRemoveColumn}
      onUpdate={handleUpdateColumn}
      onMoveUp={handleMoveUp}
      onMoveDown={handleMoveDown}
      renderNameField={(col, index, onUpdate) => (
        <TextField
          label="Label key"
          value={col.name}
          onChange={(e) =>
            onUpdate(index, (draft) => {
              draft.name = e.target.value;
            })
          }
          size="small"
          fullWidth
        />
      )}
    />
  );
}
