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
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
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
import { useSnackbar } from '@perses-dev/components';
import {
  PanelProps,
  parseVariables,
  replaceVariablesInString,
  useAllVariableValues,
  useDatasourceClient,
} from '@perses-dev/plugin-system';
import { Alert, AlertsData } from '@perses-dev/spec';
import { useQueryClient } from '@tanstack/react-query';
import BellOffIcon from 'mdi-material-ui/BellOff';
import BookOpenIcon from 'mdi-material-ui/BookOpen';
import ChevronDownIcon from 'mdi-material-ui/ChevronDown';
import ChevronRightIcon from 'mdi-material-ui/ChevronRight';
import MagnifyIcon from 'mdi-material-ui/Magnify';
import UnfoldLessHorizontalIcon from 'mdi-material-ui/UnfoldLessHorizontal';
import UnfoldMoreHorizontalIcon from 'mdi-material-ui/UnfoldMoreHorizontal';
import { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SilenceForm } from '../../components/SilenceForm';
import { StatusBadge } from '../../components/StatusBadge';
import { AlertManagerClient, extractDatasourceSelector } from '../../model';
import { PostableSilence } from '../../model/api-types';
import {
  AlertAction,
  AlertTableOptions,
  ALL_ALERT_ACTIONS,
  ColumnDefinition,
  deduplicateAlerts,
  extractLabelKeys,
  getGroupKey,
  getGroupSummary,
  GroupSummary,
  LabelColorMapping,
} from './alert-table-model';
import { compareAlertsByColumn, compareGroupsByColumn, SortState } from './alert-table-sorting';
import { getLabelColor } from './label-colors';

export type AlertTablePanelProps = PanelProps<AlertTableOptions, AlertsData>;

interface AlertGroup {
  key: string;
  alerts: Alert[];
  summary: GroupSummary;
}

function GroupSummaryChips({ summary }: { summary: GroupSummary }): ReactElement {
  return (
    <Stack direction="row" spacing={0.5}>
      {summary.firing > 0 && <Chip label={`${summary.firing} firing`} color="error" size="small" />}
      {summary.suppressed > 0 && <Chip label={`${summary.suppressed} silenced`} color="warning" size="small" />}
      {summary.pending > 0 && <Chip label={`${summary.pending} pending`} color="default" size="small" />}
    </Stack>
  );
}

function LabelValueSummaryChips({
  summary,
  mapping,
}: {
  summary: GroupSummary;
  mapping: LabelColorMapping;
}): ReactElement | null {
  const counts = summary.labelCounts?.[mapping.labelKey];
  if (!counts || Object.keys(counts).length === 0) {
    return null;
  }

  return (
    <Stack direction="row" spacing={0.5}>
      {Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .map(([value, count]) => {
          const bgColor = getLabelColor(value, mapping);
          return (
            <Chip
              key={value}
              label={`${count} ${value}`}
              size="small"
              sx={{
                backgroundColor: bgColor,
                color: '#fff',
                fontWeight: 500,
              }}
            />
          );
        })}
    </Stack>
  );
}

function AlertRow({
  alert,
  allowedActions,
  columnDefs,
  columnKeySet,
  mappingsByKey,
  onSilence,
  duplicateCount,
  showDuplicates,
}: {
  alert: Alert;
  allowedActions: AlertAction[];
  columnDefs: ColumnDefinition[];
  columnKeySet: Set<string>;
  mappingsByKey: Map<string, LabelColorMapping>;
  onSilence: (alert: Alert) => void;
  duplicateCount?: number;
  showDuplicates: boolean;
}): ReactElement {
  const runbookUrl = alert.annotations?.runbook_url;
  const showActions = allowedActions.length > 0;

  return (
    <TableRow hover>
      <TableCell>
        <StatusBadge status={alert.suppressed ? 'suppressed' : alert.state} variant="alert" />
      </TableCell>
      <TableCell>{alert.name}</TableCell>
      {columnDefs.map((col) => {
        const value = alert.labels[col.name];
        const mapping = mappingsByKey.get(col.name);
        if (value !== undefined && mapping) {
          const bgColor = getLabelColor(value, mapping);
          return (
            <TableCell key={col.name}>
              <Chip label={value} size="small" sx={{ backgroundColor: bgColor, color: '#fff', fontWeight: 500 }} />
            </TableCell>
          );
        }
        return <TableCell key={col.name}>{value ?? ''}</TableCell>;
      })}
      {showDuplicates && (
        <TableCell>
          {duplicateCount !== undefined && (
            <Chip label={`${duplicateCount}`} size="small" variant="outlined" color="info" />
          )}
        </TableCell>
      )}
      <TableCell>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {Object.entries(alert.labels)
            .filter(([key]) => key !== 'alertname' && !columnKeySet.has(key))
            .map(([key, value]) => {
              const mapping = mappingsByKey.get(key);
              if (mapping) {
                const bgColor = getLabelColor(value, mapping);
                return (
                  <Chip
                    key={key}
                    label={`${key}=${value}`}
                    size="small"
                    sx={{ backgroundColor: bgColor, color: '#fff', fontWeight: 500 }}
                  />
                );
              }
              return <Chip key={key} label={`${key}=${value}`} size="small" variant="outlined" />;
            })}
        </Stack>
      </TableCell>
      {showActions && (
        <TableCell>
          <Stack direction="row" spacing={0.5}>
            {allowedActions.includes('silence') && !alert.suppressed && (
              <Tooltip title="Silence this alert">
                <IconButton size="small" aria-label="Silence alert" onClick={() => onSilence(alert)}>
                  <BellOffIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {allowedActions.includes('runbook') && runbookUrl && (
              <Tooltip title="View runbook">
                <IconButton
                  size="small"
                  aria-label="View runbook"
                  component="a"
                  href={runbookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <BookOpenIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </TableCell>
      )}
    </TableRow>
  );
}

function AlertGroupRow({
  group,
  expanded,
  allowedActions,
  columnDefs,
  columnKeySet,
  labelColorMappings,
  mappingsByKey,
  onToggle,
  onSilence,
  duplicateCounts,
  showDuplicates,
}: {
  group: AlertGroup;
  expanded: boolean;
  allowedActions: AlertAction[];
  columnDefs: ColumnDefinition[];
  columnKeySet: Set<string>;
  labelColorMappings: LabelColorMapping[];
  mappingsByKey: Map<string, LabelColorMapping>;
  onToggle: () => void;
  onSilence: (alert: Alert) => void;
  duplicateCounts: Map<Alert, number>;
  showDuplicates: boolean;
}): ReactElement {
  const showActions = allowedActions.length > 0;

  return (
    <>
      <TableRow sx={{ cursor: 'pointer', '& > td': { fontWeight: 'bold' } }} onClick={onToggle}>
        <TableCell colSpan={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
            <Typography variant="body2" fontWeight="bold">
              {group.key || 'Ungrouped'}
            </Typography>
            <Chip label={`${group.summary.total}`} size="small" variant="outlined" />
          </Stack>
        </TableCell>
        {columnDefs.map((col) => {
          const counts = group.summary.labelCounts?.[col.name];
          const mapping = mappingsByKey.get(col.name);
          if (counts && mapping) {
            return (
              <TableCell key={col.name}>
                <LabelValueSummaryChips summary={group.summary} mapping={mapping} />
              </TableCell>
            );
          }
          if (counts) {
            return (
              <TableCell key={col.name}>
                <Stack direction="row" spacing={0.5}>
                  {Object.entries(counts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([value, count]) => (
                      <Chip key={value} label={`${count} ${value}`} size="small" variant="outlined" />
                    ))}
                </Stack>
              </TableCell>
            );
          }
          return <TableCell key={col.name} />;
        })}
        {showDuplicates && <TableCell />}
        <TableCell>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <GroupSummaryChips summary={group.summary} />
            {labelColorMappings
              .filter((mapping) => !columnKeySet.has(mapping.labelKey))
              .map((mapping) => (
                <LabelValueSummaryChips key={mapping.labelKey} summary={group.summary} mapping={mapping} />
              ))}
          </Stack>
        </TableCell>
        {showActions && <TableCell />}
      </TableRow>
      {expanded &&
        group.alerts.map((alert, idx) => (
          <AlertRow
            key={alert.id ?? String(idx)}
            alert={alert}
            allowedActions={allowedActions}
            columnDefs={columnDefs}
            columnKeySet={columnKeySet}
            mappingsByKey={mappingsByKey}
            onSilence={onSilence}
            duplicateCount={duplicateCounts.get(alert)}
            showDuplicates={showDuplicates}
          />
        ))}
    </>
  );
}

/**
 * Alert hierarchical table panel component.
 * Displays alerts grouped by configurable labels with deduplication.
 */
export function AlertTablePanel({ spec, queryResults, contentDimensions }: AlertTablePanelProps): ReactElement {
  const datasourceSelector = useMemo(() => extractDatasourceSelector(queryResults), [queryResults]);
  const { data: amClient } = useDatasourceClient<AlertManagerClient>(datasourceSelector);
  const queryClient = useQueryClient();

  const [silenceTarget, setSilenceTarget] = useState<Alert | null>(null);
  const silenceKeyRef = useRef(0);
  const handleSetSilenceTarget = useCallback((alert: Alert) => {
    silenceKeyRef.current++;
    setSilenceTarget(alert);
  }, []);
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const { successSnackbar, exceptionSnackbar } = useSnackbar();

  const handleSilenceSubmit = useCallback(
    async (silence: PostableSilence) => {
      if (!amClient) return;
      try {
        await amClient.createSilence(silence);
        setSilenceTarget(null);
        successSnackbar('Silence created successfully');
        queryClient.invalidateQueries({ queryKey: ['query', 'AlertsQuery'] });
        queryClient.invalidateQueries({ queryKey: ['query', 'SilencesQuery'] });
      } catch (err) {
        exceptionSnackbar(err);
      }
    },
    [amClient, queryClient, successSnackbar, exceptionSnackbar]
  );

  const silenceInitial = useMemo(() => {
    if (!silenceTarget) return undefined;
    return {
      matchers: Object.entries(silenceTarget.labels).map(([name, value]) => ({
        name,
        value,
        isEqual: true,
        isRegex: false,
      })),
    };
  }, [silenceTarget]);

  const defaultGroupBy = useMemo(() => spec.defaultGroupBy ?? ['alertname'], [spec.defaultGroupBy]);
  const variableNames = useMemo(
    () => [...new Set(defaultGroupBy.flatMap((entry) => parseVariables(entry)))],
    [defaultGroupBy]
  );
  const variableState = useAllVariableValues(variableNames);

  const resolvedDefaultGroupBy = useMemo(() => {
    const result: string[] = [];
    for (const entry of defaultGroupBy) {
      const vars = parseVariables(entry);
      if (vars.length === 0) {
        result.push(entry);
      } else if (vars.length === 1 && (entry === `$${vars[0]}` || entry === `\${${vars[0]}}`)) {
        const varState = variableState[vars[0] ?? ''];
        if (varState?.value) {
          if (Array.isArray(varState.value)) {
            result.push(...varState.value);
          } else {
            result.push(varState.value);
          }
        }
      } else {
        const resolved = replaceVariablesInString(entry, variableState);
        if (resolved) result.push(resolved);
      }
    }
    return result;
  }, [defaultGroupBy, variableState]);

  const [groupBy, setGroupBy] = useState<string[]>(resolvedDefaultGroupBy);

  useEffect(() => {
    setGroupBy(resolvedDefaultGroupBy);
  }, [resolvedDefaultGroupBy]);

  const effectiveActions = useMemo<AlertAction[]>(
    () => spec.allowedActions ?? ALL_ALERT_ACTIONS,
    [spec.allowedActions]
  );
  const showActionsColumn = effectiveActions.length > 0;
  const columnDefs = useMemo(() => spec.columns ?? [], [spec.columns]);
  const columnKeySet = useMemo(() => new Set(columnDefs.map((c) => c.name)), [columnDefs]);
  const labelColorMappings = useMemo(() => spec.labelColorMappings ?? [], [spec.labelColorMappings]);
  const labelKeys = useMemo(() => labelColorMappings.map((m) => m.labelKey), [labelColorMappings]);
  const mappingsByKey = useMemo(() => new Map(labelColorMappings.map((m) => [m.labelKey, m])), [labelColorMappings]);

  const allTrackedKeys = useMemo(
    () => [...new Set([...labelKeys, ...columnDefs.map((c) => c.name)])],
    [labelKeys, columnDefs]
  );

  const initialSort = useMemo<SortState | null>(() => {
    const col = columnDefs.find((c) => c.sort && c.enableSorting !== false);
    if (!col?.sort) return null;
    return { columnName: col.name, direction: col.sort, mode: col.sortMode ?? 'alphabetical' };
  }, [columnDefs]);
  const [sortState, setSortState] = useState<SortState | null>(initialSort);

  const handleSortClick = useCallback((col: ColumnDefinition): void => {
    setSortState((prev) => {
      if (prev?.columnName === col.name) {
        return prev.direction === 'asc' ? { ...prev, direction: 'desc' } : null;
      }
      return { columnName: col.name, direction: 'asc', mode: col.sortMode ?? 'alphabetical' };
    });
  }, []);

  // Flatten all alerts from all query results
  const allAlerts = useMemo(() => {
    return queryResults.flatMap((result) => result.data?.alerts ?? []);
  }, [queryResults]);

  // Deduplicate
  const dedupConfig = useMemo(() => spec.deduplication ?? { mode: 'fingerprint' as const }, [spec.deduplication]);
  const dedupResult = useMemo(() => deduplicateAlerts(allAlerts, dedupConfig), [allAlerts, dedupConfig]);
  const dedupAlerts = dedupResult.alerts;
  const duplicateCounts = dedupResult.duplicateCounts;
  const hasDuplicates = duplicateCounts.size > 0;

  // Filter by search term
  const alerts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return dedupAlerts;
    return dedupAlerts.filter((a: Alert) => {
      if (a.state.toLowerCase().includes(term)) return true;
      if (a.suppressed && ('suppressed'.includes(term) || 'silenced'.includes(term))) return true;
      if (Object.values(a.labels).some((v) => v.toLowerCase().includes(term))) return true;
      if (a.annotations && Object.values(a.annotations).some((v) => v.toLowerCase().includes(term))) return true;
      return false;
    });
  }, [dedupAlerts, search]);

  // Extract available label keys for group-by selector
  const availableLabelKeys = useMemo(() => extractLabelKeys(alerts), [alerts]);

  // Group alerts
  const groups = useMemo<AlertGroup[]>(() => {
    let result: AlertGroup[];

    if (groupBy.length === 0) {
      result = [{ key: '', alerts: [...alerts], summary: getGroupSummary(alerts, allTrackedKeys) }];
    } else {
      const groupMap = new Map<string, Alert[]>();
      for (const alert of alerts) {
        const key = getGroupKey(alert, groupBy);
        const existing = groupMap.get(key) ?? [];
        existing.push(alert);
        groupMap.set(key, existing);
      }

      result = Array.from(groupMap.entries()).map(([key, groupAlerts]) => ({
        key,
        alerts: groupAlerts,
        summary: getGroupSummary(groupAlerts, allTrackedKeys),
      }));
    }

    if (sortState) {
      for (const group of result) {
        group.alerts.sort((a, b) => compareAlertsByColumn(a, b, sortState));
      }
      result.sort((a, b) =>
        compareGroupsByColumn(
          a.summary.labelCounts?.[sortState.columnName],
          b.summary.labelCounts?.[sortState.columnName],
          sortState
        )
      );
    }

    return result;
  }, [alerts, groupBy, allTrackedKeys, sortState]);

  const prevGroupKeysRef = useRef<string>('');
  useEffect(() => {
    const currentKeys = groups.map((g) => g.key).join('\0');
    if (currentKeys === prevGroupKeysRef.current) return;
    prevGroupKeysRef.current = currentKeys;

    if (groups.length === 1) {
      setExpandedGroups(new Set(groups.map((g) => g.key)));
    } else {
      setExpandedGroups(new Set());
    }
  }, [groups]);

  const handleToggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    setExpandedGroups(new Set(groups.map((g) => g.key)));
  }, [groups]);

  const handleCollapseAll = useCallback(() => {
    setExpandedGroups(new Set());
  }, []);

  const handleGroupByChange = (event: SelectChangeEvent<string[]>): void => {
    const value = event.target.value;
    setGroupBy(typeof value === 'string' ? value.split(',') : value);
  };

  if (alerts.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: contentDimensions?.height ?? '100%',
        }}
      >
        <Typography>No alerts to display</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1} sx={{ height: contentDimensions?.height, overflow: 'auto' }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ px: 1, pt: 1 }}>
        <TextField
          size="small"
          placeholder="Search alerts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 200 }}
          slotProps={{
            htmlInput: { 'aria-label': 'Search alerts' },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <MagnifyIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="group-by-label">Group by</InputLabel>
          <Select
            labelId="group-by-label"
            multiple
            value={groupBy}
            onChange={handleGroupByChange}
            label="Group by"
            renderValue={(selected) => selected.join(', ')}
          >
            {availableLabelKeys.map((key) => (
              <MenuItem key={key} value={key}>
                {key}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
          {alerts.length} alert{alerts.length !== 1 ? 's' : ''} in {groups.length} group
          {groups.length !== 1 ? 's' : ''}
        </Typography>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Expand all groups">
            <IconButton size="small" aria-label="Expand all groups" onClick={handleExpandAll}>
              <UnfoldMoreHorizontalIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Collapse all groups">
            <IconButton size="small" aria-label="Collapse all groups" onClick={handleCollapseAll}>
              <UnfoldLessHorizontalIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
      <TableContainer>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Status</TableCell>
              <TableCell>Alert Name</TableCell>
              {columnDefs.map((col) => (
                <TableCell
                  key={col.name}
                  sortDirection={sortState?.columnName === col.name ? sortState.direction : false}
                >
                  {col.enableSorting !== false ? (
                    <TableSortLabel
                      active={sortState?.columnName === col.name}
                      direction={sortState?.columnName === col.name ? sortState.direction : 'asc'}
                      onClick={() => handleSortClick(col)}
                    >
                      {col.header ?? col.name}
                    </TableSortLabel>
                  ) : (
                    (col.header ?? col.name)
                  )}
                </TableCell>
              ))}
              {hasDuplicates && <TableCell>Duplicates</TableCell>}
              <TableCell>Labels</TableCell>
              {showActionsColumn && <TableCell>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map((group) => (
              <AlertGroupRow
                key={group.key}
                group={group}
                expanded={expandedGroups.has(group.key)}
                allowedActions={effectiveActions}
                columnDefs={columnDefs}
                columnKeySet={columnKeySet}
                labelColorMappings={labelColorMappings}
                mappingsByKey={mappingsByKey}
                onToggle={() => handleToggleGroup(group.key)}
                onSilence={handleSetSilenceTarget}
                duplicateCounts={duplicateCounts}
                showDuplicates={hasDuplicates}
              />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <SilenceForm
        key={silenceKeyRef.current}
        open={!!silenceTarget}
        onClose={() => setSilenceTarget(null)}
        onSubmit={handleSilenceSubmit}
        initialSilence={silenceInitial}
      />
    </Stack>
  );
}
