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
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { OptionsEditorGroup } from '@perses-dev/components';
import ArrowUpIcon from 'mdi-material-ui/ArrowUp';
import ArrowDownIcon from 'mdi-material-ui/ArrowDown';
import DeleteIcon from 'mdi-material-ui/Delete';
import PlusIcon from 'mdi-material-ui/Plus';
import { ReactElement, useCallback, useRef } from 'react';

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
}

const DEFAULT_SORT_LABELS: Record<string, string> = {
  none: 'None',
  asc: 'Ascending',
  desc: 'Descending',
};

function ColumnEntry<C extends BaseColumnDefinition>({
  column,
  index,
  isFirst,
  isLast,
  sortModeLabels,
  defaultSortMode,
  getDisplayName,
  getHeaderPlaceholder,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  renderNameField,
}: {
  column: C;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  sortModeLabels: Record<string, string>;
  defaultSortMode: string;
  getDisplayName: (column: C) => string;
  getHeaderPlaceholder: (column: C) => string;
  onUpdate: ColumnUpdater<C>;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  renderNameField: (column: C, index: number, onUpdate: ColumnUpdater<C>) => ReactElement;
}): ReactElement {
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2">{getDisplayName(column)}</Typography>
          <Stack direction="row" spacing={0.5}>
            <IconButton size="small" onClick={() => onMoveUp(index)} disabled={isFirst} aria-label="Move column up">
              <ArrowUpIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => onMoveDown(index)} disabled={isLast} aria-label="Move column down">
              <ArrowDownIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => onRemove(index)} aria-label="Remove column">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Box sx={{ flex: 1 }}>{renderNameField(column, index, onUpdate)}</Box>
          <TextField
            label="Header"
            value={column.header ?? ''}
            onChange={(e) =>
              onUpdate(index, (draft) => {
                draft.header = e.target.value || undefined;
              })
            }
            size="small"
            sx={{ flex: 1 }}
            placeholder={getHeaderPlaceholder(column)}
          />
        </Stack>
        <FormControlLabel
          control={
            <Checkbox
              checked={column.enableSorting !== false}
              onChange={(e) =>
                onUpdate(index, (draft) => {
                  draft.enableSorting = e.target.checked ? undefined : false;
                })
              }
              size="small"
            />
          }
          label="Allow header sorting"
        />
        <Stack direction="row" spacing={1}>
          <FormControl size="small" sx={{ flex: 1 }}>
            <InputLabel id={`sort-mode-label-${index}`}>Sort mode</InputLabel>
            <Select
              labelId={`sort-mode-label-${index}`}
              value={column.sortMode ?? defaultSortMode}
              onChange={(e) =>
                onUpdate(index, (draft) => {
                  draft.sortMode = e.target.value;
                })
              }
              label="Sort mode"
            >
              {Object.entries(sortModeLabels).map(([mode, label]) => (
                <MenuItem key={mode} value={mode}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ flex: 1 }}>
            <InputLabel id={`default-sort-label-${index}`}>Default sort</InputLabel>
            <Select
              labelId={`default-sort-label-${index}`}
              value={column.sort ?? 'none'}
              onChange={(e) =>
                onUpdate(index, (draft) => {
                  const val = e.target.value;
                  draft.sort = val === 'none' ? undefined : (val as 'asc' | 'desc');
                })
              }
              label="Default sort"
            >
              {Object.entries(DEFAULT_SORT_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Stack>
    </Box>
  );
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
  } = props;

  const idCounterRef = useRef(0);
  const idsRef = useRef<number[]>([]);

  while (idsRef.current.length < columns.length) {
    idsRef.current.push(idCounterRef.current++);
  }
  idsRef.current.length = columns.length;

  const handleAdd = useCallback((): void => {
    idsRef.current.push(idCounterRef.current++);
    onAdd();
  }, [onAdd]);

  const handleRemove = useCallback(
    (index: number): void => {
      idsRef.current.splice(index, 1);
      onRemove(index);
    },
    [onRemove]
  );

  const handleMoveUp = useCallback(
    (index: number): void => {
      if (index <= 0) return;
      const ids = idsRef.current;
      const id = ids.splice(index, 1)[0]!;
      ids.splice(index - 1, 0, id);
      onMoveUp(index);
    },
    [onMoveUp]
  );

  const handleMoveDown = useCallback(
    (index: number): void => {
      const ids = idsRef.current;
      if (index >= ids.length - 1) return;
      const id = ids.splice(index, 1)[0]!;
      ids.splice(index + 1, 0, id);
      onMoveDown(index);
    },
    [onMoveDown]
  );

  return (
    <OptionsEditorGroup title="Columns">
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
        {columns.map((column, index) => (
          <Box key={idsRef.current[index]}>
            {index > 0 && <Divider sx={{ mb: 2 }} />}
            <ColumnEntry
              column={column}
              index={index}
              isFirst={index === 0}
              isLast={index === columns.length - 1}
              sortModeLabels={sortModeLabels}
              defaultSortMode={defaultSortMode}
              getDisplayName={getDisplayName}
              getHeaderPlaceholder={getHeaderPlaceholder}
              onUpdate={onUpdate}
              onRemove={handleRemove}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              renderNameField={renderNameField}
            />
          </Box>
        ))}
        <Button variant="outlined" size="small" startIcon={<PlusIcon />} onClick={handleAdd}>
          Add column
        </Button>
      </Stack>
    </OptionsEditorGroup>
  );
}
