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

import { Checkbox, FormControlLabel, Stack, TextField } from '@mui/material';
import { OptionsEditorProps } from '@perses-dev/plugin-system';
import { produce } from 'immer';
import { ReactElement, useCallback } from 'react';
import { ColumnsEditor } from './components/ColumnsEditor';
import { LogsTableOptions, LogsColumnDefinition, LogsColumnSortMode } from './model';

const SORT_MODE_LABELS: Record<LogsColumnSortMode, string> = {
  alphabetical: 'Alphabetical',
  numeric: 'Numeric',
  timestamp: 'Timestamp',
};

export function LogsTableColumnsEditor(props: OptionsEditorProps<LogsTableOptions>): ReactElement {
  const { value, onChange } = props;
  const columns = value.columns ?? [];

  const updateColumns = useCallback(
    (recipe: (draft: LogsColumnDefinition[]) => void) => {
      onChange(
        produce(value, (draft) => {
          if (!draft.columns) draft.columns = [];
          recipe(draft.columns);
        })
      );
    },
    [value, onChange]
  );

  const handleAddColumn = useCallback(() => {
    updateColumns((cols) => {
      if (cols.length === 0) {
        cols.push(
          { name: 'timestamp', header: 'Timestamp', sortMode: 'timestamp', sort: 'desc' },
          { name: 'line', header: 'Log line', allowWrap: true, enableSorting: false }
        );
      } else {
        cols.push({ name: '' });
      }
    });
  }, [updateColumns]);

  const handleRemoveColumn = useCallback(
    (index: number) => updateColumns((cols) => cols.splice(index, 1)),
    [updateColumns]
  );

  const handleUpdateColumn = useCallback(
    (index: number, updater: (draft: LogsColumnDefinition) => void) => {
      updateColumns((cols) => {
        if (cols[index]) updater(cols[index]);
      });
    },
    [updateColumns]
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      updateColumns((cols) => {
        const [item] = cols.splice(index, 1);
        if (item) cols.splice(index - 1, 0, item);
      });
    },
    [updateColumns]
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= columns.length - 1) return;
      updateColumns((cols) => {
        const [item] = cols.splice(index, 1);
        if (item) cols.splice(index + 1, 0, item);
      });
    },
    [updateColumns, columns.length]
  );

  return (
    <ColumnsEditor<LogsColumnDefinition>
      columns={columns}
      description="Timestamp and Log line are shown by default. Add columns below to customize which columns are visible and their order."
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
          label="Column name"
          value={col.name}
          onChange={(e) =>
            onUpdate(index, (draft) => {
              draft.name = e.target.value;
            })
          }
          size="small"
          fullWidth
          helperText="Use 'timestamp', 'line', or a label key"
        />
      )}
      renderExtraFields={(col, index, onUpdate) => (
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label="Width (px)"
            type="number"
            value={col.width ?? ''}
            onChange={(e) =>
              onUpdate(index, (draft) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                draft.width = val && val > 0 ? val : undefined;
              })
            }
            size="small"
            sx={{ width: 120 }}
            placeholder="auto"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={col.allowWrap ?? false}
                onChange={(e) =>
                  onUpdate(index, (draft) => {
                    draft.allowWrap = e.target.checked || undefined;
                  })
                }
                size="small"
              />
            }
            label="Wrap content"
          />
        </Stack>
      )}
    />
  );
}
