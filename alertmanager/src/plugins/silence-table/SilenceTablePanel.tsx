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
  IconButton,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Dialog, useSnackbar } from '@perses-dev/components';
import { PanelProps, useDatasourceClient } from '@perses-dev/plugin-system';
import { Silence, SilencesData } from '@perses-dev/spec';
import { useQueryClient } from '@tanstack/react-query';
import DeleteIcon from 'mdi-material-ui/Delete';
import MagnifyIcon from 'mdi-material-ui/Magnify';
import { ReactElement, useCallback, useMemo, useState } from 'react';
import { MatchersList } from '../../components/MatchersList';
import { StatusBadge } from '../../components/StatusBadge';
import { AlertManagerClient, extractDatasourceSelector } from '../../model';
import {
  ALL_SILENCE_ACTIONS,
  DEFAULT_COLUMN_HEADERS,
  DEFAULT_SILENCE_COLUMNS,
  SilenceAction,
  SilenceColumnDefinition,
  SilenceFieldName,
  SilenceTableOptions,
  getSilenceDuration,
  inferSortMode,
} from './silence-table-model';
import { SilenceSortState, compareSilencesByColumn } from './silence-table-sorting';

export type SilenceTablePanelProps = PanelProps<SilenceTableOptions, SilencesData>;

function renderSilenceCell(silence: Silence, field: SilenceFieldName): ReactElement {
  switch (field) {
    case 'status':
      return <StatusBadge status={silence.state} variant="silence" />;
    case 'matchers':
      return <MatchersList matchers={silence.matchers} />;
    case 'startsAt':
    case 'endsAt':
    case 'updatedAt': {
      const raw = field === 'updatedAt' ? silence.updatedAt : silence[field];
      return <>{raw ? new Date(raw).toLocaleString() : ''}</>;
    }
    case 'duration':
      return <>{getSilenceDuration(silence)}</>;
    case 'comment':
      return (
        <Tooltip title={silence.comment ?? ''}>
          <Typography
            variant="body2"
            sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {silence.comment ?? ''}
          </Typography>
        </Tooltip>
      );
    case 'createdBy':
      return <>{silence.createdBy}</>;
  }
}

function SilenceRow({
  silence,
  columnDefs,
  allowedActions,
  onExpire,
}: {
  silence: Silence;
  columnDefs: SilenceColumnDefinition[];
  allowedActions: SilenceAction[];
  onExpire: (silence: Silence) => void;
}): ReactElement {
  const showActions = allowedActions.length > 0;
  const isExpired = silence.state === 'expired';

  return (
    <TableRow hover>
      {columnDefs.map((col) => (
        <TableCell key={col.name}>{renderSilenceCell(silence, col.name)}</TableCell>
      ))}
      {showActions && (
        <TableCell>
          <Stack direction="row" spacing={0.5}>
            {allowedActions.includes('expire') && (
              <Tooltip title={isExpired ? 'Already expired' : 'Expire silence'}>
                <span>
                  <IconButton
                    size="small"
                    aria-label="Expire silence"
                    onClick={() => onExpire(silence)}
                    disabled={isExpired}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Stack>
        </TableCell>
      )}
    </TableRow>
  );
}

/**
 * Silence table panel component.
 * Displays silences with matchers, status, creator, duration, and actions.
 */
export function SilenceTablePanel({ spec, queryResults, contentDimensions }: SilenceTablePanelProps): ReactElement {
  const datasourceSelector = useMemo(() => extractDatasourceSelector(queryResults), [queryResults]);
  const { data: amClient } = useDatasourceClient<AlertManagerClient>(datasourceSelector);
  const queryClient = useQueryClient();

  const [expireTarget, setExpireTarget] = useState<Silence | null>(null);
  const [isExpiring, setIsExpiring] = useState(false);
  const { successSnackbar, exceptionSnackbar } = useSnackbar();

  const handleExpire = useCallback(async () => {
    if (!amClient || !expireTarget) return;
    setIsExpiring(true);
    try {
      await amClient.deleteSilence(expireTarget.id);
      setExpireTarget(null);
      successSnackbar('Silence expired successfully');
      queryClient.invalidateQueries({ queryKey: ['query', 'AlertsQuery'] });
      queryClient.invalidateQueries({ queryKey: ['query', 'SilencesQuery'] });
    } catch (err) {
      exceptionSnackbar(err);
    } finally {
      setIsExpiring(false);
    }
  }, [amClient, expireTarget, queryClient, successSnackbar, exceptionSnackbar]);

  const [search, setSearch] = useState('');

  const effectiveActions = useMemo<SilenceAction[]>(
    () => spec?.allowedActions ?? ALL_SILENCE_ACTIONS,
    [spec?.allowedActions]
  );
  const showActionsColumn = effectiveActions.length > 0;

  const columnDefs = useMemo(() => {
    if (!spec.columns || spec.columns.length === 0) return DEFAULT_SILENCE_COLUMNS;
    const defaultNames = new Set(DEFAULT_SILENCE_COLUMNS.map((c) => c.name));
    const extra = spec.columns.filter((c) => !defaultNames.has(c.name));
    return [...DEFAULT_SILENCE_COLUMNS, ...extra];
  }, [spec.columns]);

  const initialSort = useMemo<SilenceSortState | null>(() => {
    const col = columnDefs.find((c) => c.sort && c.enableSorting !== false);
    if (!col?.sort) return null;
    return { fieldName: col.name, direction: col.sort, mode: col.sortMode ?? inferSortMode(col.name) };
  }, [columnDefs]);
  const [sortState, setSortState] = useState<SilenceSortState | null>(initialSort);

  const handleSortClick = useCallback((col: SilenceColumnDefinition): void => {
    setSortState((prev) => {
      if (prev?.fieldName === col.name) {
        return prev.direction === 'asc' ? { ...prev, direction: 'desc' } : null;
      }
      return { fieldName: col.name, direction: 'asc', mode: col.sortMode ?? inferSortMode(col.name) };
    });
  }, []);

  // Flatten all silences from all query results
  const allSilences = useMemo(() => {
    return queryResults.flatMap((result) => result.data?.silences ?? []);
  }, [queryResults]);

  const filteredSilences = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return allSilences;
    return allSilences.filter((s) => {
      if (s.state.toLowerCase().includes(term)) return true;
      if (s.createdBy.toLowerCase().includes(term)) return true;
      if (s.comment?.toLowerCase().includes(term)) return true;
      return s.matchers.some((m) => m.name.toLowerCase().includes(term) || m.value.toLowerCase().includes(term));
    });
  }, [allSilences, search]);

  const silences = useMemo(() => {
    if (!sortState) return filteredSilences;
    return [...filteredSilences].sort((a, b) => compareSilencesByColumn(a, b, sortState));
  }, [filteredSilences, sortState]);

  if (silences.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: contentDimensions?.height ?? '100%',
        }}
      >
        <Typography>No silences to display</Typography>
      </Box>
    );
  }

  return (
    <TableContainer sx={{ height: contentDimensions?.height, overflow: 'auto' }}>
      <Box sx={{ px: 1, py: 0.5 }}>
        <TextField
          size="small"
          placeholder="Search silences..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          slotProps={{
            htmlInput: { 'aria-label': 'Search silences' },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <MagnifyIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {columnDefs.map((col) => (
              <TableCell key={col.name} sortDirection={sortState?.fieldName === col.name ? sortState.direction : false}>
                {col.enableSorting !== false ? (
                  <TableSortLabel
                    active={sortState?.fieldName === col.name}
                    direction={sortState?.fieldName === col.name ? sortState.direction : 'asc'}
                    onClick={() => handleSortClick(col)}
                  >
                    {col.header ?? DEFAULT_COLUMN_HEADERS[col.name]}
                  </TableSortLabel>
                ) : (
                  (col.header ?? DEFAULT_COLUMN_HEADERS[col.name])
                )}
              </TableCell>
            ))}
            {showActionsColumn && <TableCell>Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {silences.map((silence) => (
            <SilenceRow
              key={silence.id}
              silence={silence}
              columnDefs={columnDefs}
              allowedActions={effectiveActions}
              onExpire={setExpireTarget}
            />
          ))}
        </TableBody>
      </Table>
      <Dialog open={!!expireTarget} onClose={() => setExpireTarget(null)}>
        <Dialog.Header onClose={() => setExpireTarget(null)}>Expire Silence</Dialog.Header>
        <Dialog.Content>
          Are you sure you want to expire this silence? Alerts matching its matchers will start firing again.
        </Dialog.Content>
        <Dialog.Actions>
          <Dialog.SecondaryButton onClick={() => setExpireTarget(null)}>Cancel</Dialog.SecondaryButton>
          <Dialog.PrimaryButton onClick={handleExpire} disabled={isExpiring}>
            {isExpiring ? 'Expiring...' : 'Expire'}
          </Dialog.PrimaryButton>
        </Dialog.Actions>
      </Dialog>
    </TableContainer>
  );
}
