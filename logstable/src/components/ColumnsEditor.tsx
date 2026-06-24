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

import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowUp from 'mdi-material-ui/ArrowUp';
import ArrowDown from 'mdi-material-ui/ArrowDown';
import DeleteIcon from 'mdi-material-ui/Delete';
import PlusIcon from 'mdi-material-ui/Plus';
import { OptionsEditorGroup } from '@perses-dev/components';
import { ReactElement } from 'react';

export interface BaseColumnDefinition {
  name: string;
  header?: string;
  enableSorting?: boolean;
  sort?: 'asc' | 'desc';
  sortMode?: string;
}

export type ColumnUpdater<C> = (index: number, updater: (draft: C) => void) => void;

export interface ColumnsEditorProps<C extends BaseColumnDefinition> {
  columns: C[];
  description: string;
  sortModeLabels: Record<string, string>;
  defaultSortMode: string;
  getDisplayName: (column: C) => string;
  getHeaderPlaceholder: (column: C) => string;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: ColumnUpdater<C>;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  renderNameField: (column: C, index: number, onUpdate: ColumnUpdater<C>) => ReactElement;
  renderExtraFields?: (column: C, index: number, onUpdate: ColumnUpdater<C>) => ReactElement;
}

export function ColumnsEditor<C extends BaseColumnDefinition>(props: ColumnsEditorProps<C>): ReactElement {
  const {
    columns,
    description,
    sortModeLabels,
    defaultSortMode,
    getDisplayName,
    getHeaderPlaceholder,
    onAdd,
    onRemove,
    onUpdate,
    onMoveUp,
    onMoveDown,
    renderNameField,
    renderExtraFields,
  } = props;

  return (
    <OptionsEditorGroup title="Columns">
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {description}
      </Typography>

      {columns.map((column, index) => {
        return (
          <Box key={index}>
            {index > 0 && <Divider sx={{ my: 1 }} />}
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
              {/* Header row: display name + action buttons */}
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2">{getDisplayName(column)}</Typography>
                <Stack direction="row" spacing={0.5}>
                  <IconButton size="small" onClick={() => onMoveUp(index)} aria-label="Move column up">
                    <ArrowUp />
                  </IconButton>
                  <IconButton size="small" onClick={() => onMoveDown(index)} aria-label="Move column down">
                    <ArrowDown />
                  </IconButton>
                  <IconButton size="small" onClick={() => onRemove(index)} aria-label="Delete column">
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              </Stack>

              {/* Name + Header row */}
              <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                <Box sx={{ flex: 1 }}>{renderNameField(column, index, onUpdate)}</Box>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    label="Header"
                    value={column.header ?? ''}
                    onChange={(e) => {
                      onUpdate(index, (draft) => {
                        draft.header = e.target.value || undefined;
                      });
                    }}
                    placeholder={getHeaderPlaceholder(column)}
                    size="small"
                    fullWidth
                  />
                </Box>
              </Stack>

              {/* Enable sorting checkbox */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={column.enableSorting !== false}
                    onChange={(e) => {
                      onUpdate(index, (draft) => {
                        draft.enableSorting = e.target.checked ? undefined : false;
                      });
                    }}
                    size="small"
                  />
                }
                label="Enable sorting"
              />

              {/* Sort mode + Default sort row */}
              <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    select
                    label="Sort mode"
                    value={column.sortMode ?? defaultSortMode}
                    onChange={(e) => {
                      onUpdate(index, (draft) => {
                        draft.sortMode = e.target.value;
                      });
                    }}
                    size="small"
                    fullWidth
                  >
                    {Object.entries(sortModeLabels).map(([value, label]) => (
                      <MenuItem key={value} value={value}>
                        {label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    select
                    label="Default sort"
                    value={column.sort ?? ''}
                    onChange={(e) => {
                      onUpdate(index, (draft) => {
                        draft.sort = (e.target.value as 'asc' | 'desc') || undefined;
                      });
                    }}
                    size="small"
                    fullWidth
                  >
                    <MenuItem value="">None</MenuItem>
                    <MenuItem value="asc">Ascending</MenuItem>
                    <MenuItem value="desc">Descending</MenuItem>
                  </TextField>
                </Box>
              </Stack>

              {/* Extra fields */}
              {renderExtraFields && <Box sx={{ mt: 1 }}>{renderExtraFields(column, index, onUpdate)}</Box>}
            </Box>
          </Box>
        );
      })}

      <Button variant="outlined" startIcon={<PlusIcon />} onClick={onAdd} sx={{ mt: 1 }}>
        Add column
      </Button>
    </OptionsEditorGroup>
  );
}
