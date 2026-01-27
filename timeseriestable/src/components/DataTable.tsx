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

import { ReactElement, ReactNode, useMemo, useCallback } from 'react';
import {
  Alert,
  Box,
  Checkbox,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { TimeSeries, TimeSeriesData, BucketTuple, TimeSeriesHistogramTuple, HistogramValue } from '@perses-dev/core';
import { ActionsOptions, PanelData, useAllVariableValues } from '@perses-dev/plugin-system';
import { useSelection } from '@perses-dev/components';
import { useSelectionItemActions } from '@perses-dev/dashboards';
import { TimeSeriesTableOptions } from '../model';
import { SeriesName } from './SeriesName';
import { EmbeddedPanel } from './EmbeddedPanel';

const MAX_FORMATTABLE_SERIES = 1000;

export interface DataTableProps {
  queryResults: Array<PanelData<TimeSeriesData>>;
  spec: TimeSeriesTableOptions;
}

/**
 * Build row data object from a TimeSeries, including all labels and value
 */
function buildRowData(ts: TimeSeries): Record<string, unknown> {
  return {
    ...ts.labels,
    name: ts.name,
    formattedName: ts.formattedName,
    value: ts.values?.[0]?.[1],
    timestamp: ts.values?.[0]?.[0],
  };
}

/**
 * Designed to display timeseries data in a prometheus like table format.
 * The first column will contain the metric name and label combination, and the second column will contain the values.
 * This is inspired by prometheus DataTable.
 * https://github.com/prometheus/prometheus/blob/2524a915915d7eb1b1207152d2e0ce5771193404/web/ui/react-app/src/pages/graph/DataTable.tsx
 * @param result timeseries query result
 * @constructor
 */
export const DataTable = ({ queryResults, spec }: DataTableProps): ReactElement | null => {
  const allVariables = useAllVariableValues();
  const series = useMemo(() => queryResults.flatMap((d) => d.data).flatMap((d) => d?.series || []), [queryResults]);

  const selectionEnabled = spec.selection?.enabled ?? false;
  const { selectionMap, setSelection, clearSelection, toggleSelection } = useSelection<
    Record<string, unknown>,
    string
  >();

  const itemActionsConfig = spec.actions ? (spec.actions as ActionsOptions) : undefined;
  const itemActionsListConfig = useMemo(
    () => (itemActionsConfig?.enabled && itemActionsConfig.displayWithItem ? itemActionsConfig.actionsList : []),
    [itemActionsConfig?.enabled, itemActionsConfig?.displayWithItem, itemActionsConfig?.actionsList]
  );

  const { getItemActionButtons, confirmDialog, actionButtons } = useSelectionItemActions({
    actions: itemActionsListConfig,
    variableState: allVariables,
  });

  const hasItemActions = actionButtons && actionButtons.length > 0;

  const allSelected = useMemo(() => {
    if (series.length === 0) return false;
    return series.every((_, idx) => selectionMap.has(idx.toString()));
  }, [series, selectionMap]);

  // Check if some (but not all) series are selected
  const someSelected = useMemo(() => {
    if (series.length === 0) return false;
    const selectedCount = series.filter((_, idx) => selectionMap.has(idx.toString())).length;
    return selectedCount > 0 && selectedCount < series.length;
  }, [series, selectionMap]);

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      clearSelection();
    } else {
      const allItems = series.map((ts, idx) => ({
        id: idx.toString(),
        item: buildRowData(ts),
      }));
      setSelection(allItems);
    }
  }, [allSelected, series, setSelection, clearSelection]);

  const handleRowSelectionToggle = useCallback(
    (ts: TimeSeries, seriesIdx: number) => {
      const rowData = buildRowData(ts);
      toggleSelection(rowData, seriesIdx.toString());
    },
    [toggleSelection]
  );

  // Memoize row data for stable references
  const rowsData = useMemo(() => {
    return series.map((ts, idx) => ({
      ts,
      idx,
      rowData: buildRowData(ts),
    }));
  }, [series]);

  if (!queryResults || !series?.length) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
        }}
      >
        <Typography>No data</Typography>
      </Box>
    );
  }

  return (
    <>
      {confirmDialog}
      {series.length >= MAX_FORMATTABLE_SERIES && (
        <Alert severity="warning">
          Showing more than {MAX_FORMATTABLE_SERIES} series, turning off label formatting for performance reasons.
        </Alert>
      )}
      <Table className="data-table">
        {selectionEnabled && series.length > 0 && (
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={someSelected}
                  checked={allSelected}
                  onChange={handleSelectAll}
                  inputProps={{ 'aria-label': 'select all series' }}
                />
              </TableCell>
              {hasItemActions && <TableCell>Actions</TableCell>}
              <TableCell>Series</TableCell>
              <TableCell>Value</TableCell>
            </TableRow>
          </TableHead>
        )}
        <TableBody>
          {rowsData.map(({ ts, idx, rowData }) => {
            const displayTimeStamps = (ts.values?.length ?? 0) > 1;
            const valuesAndTimes = ts.values
              ? ts.values.map((v, valIdx) => (
                  <Typography key={valIdx}>
                    {v[1]} {displayTimeStamps && <span>@{v[0]}</span>}
                  </Typography>
                ))
              : [];

            let histogramsAndTimes = null;
            if (ts.histograms && ts.histograms.length > 0) {
              const seriesQueryResult: PanelData<TimeSeriesData> = {
                ...queryResults[0]!,
                data: {
                  ...queryResults[0]!.data,
                  series: [queryResults[0]!.data.series[idx]!],
                },
              };

              histogramsAndTimes = ts.histograms.map((h: TimeSeriesHistogramTuple, hisIdx: number) => (
                <Stack alignItems="center" key={-hisIdx}>
                  <Box width={400} height={200}>
                    <EmbeddedPanel
                      kind="HistogramChart"
                      spec={{ unit: 'decimal', width: 400, height: 200 }}
                      queryResults={[seriesQueryResult]}
                    />
                  </Box>
                  <Stack flexDirection="row" justifyContent="space-between" width="100%">
                    <Typography>Total count: {h[1].count}</Typography>
                    <Typography>Sum: {h[1].sum}</Typography>
                  </Stack>
                  {histogramTable(h[1])}
                </Stack>
              ));
            }

            const rowId = idx.toString();
            const isSelected = selectionMap.has(rowId);
            const isFormatted = series.length < MAX_FORMATTABLE_SERIES;

            return (
              <TableRow style={{ whiteSpace: 'pre' }} key={idx}>
                {selectionEnabled && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleRowSelectionToggle(ts, idx)}
                      inputProps={{ 'aria-label': `select series ${idx}` }}
                    />
                  </TableCell>
                )}
                {hasItemActions && (
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>{getItemActionButtons({ id: rowId, data: rowData })}</Box>
                  </TableCell>
                )}
                <TableCell>
                  <SeriesName
                    name={ts.name}
                    formattedName={ts.formattedName}
                    labels={ts.labels}
                    isFormatted={isFormatted}
                  />
                </TableCell>
                <TableCell>{ts.histograms ? histogramsAndTimes : valuesAndTimes}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
};

const leftDelim = (br: number): string => (br === 3 || br === 1 ? '[' : '(');
const rightDelim = (br: number): string => (br === 3 || br === 0 ? ']' : ')');

export const bucketRangeString = ([boundaryRule, leftBoundary, rightBoundary]: [
  number,
  string,
  string,
  string,
]): string => {
  return `${leftDelim(boundaryRule)}${leftBoundary} -> ${rightBoundary}${rightDelim(boundaryRule)}`;
};

export const histogramTable = (h: HistogramValue): ReactNode => (
  <Table>
    <TableHead>
      <TableRow>
        <TableCell style={{ textAlign: 'center' }} colSpan={2}>
          Histogram Sample
        </TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      <TableRow>
        <TableCell>Range</TableCell>
        <TableCell>Count</TableCell>
      </TableRow>
      {h.buckets?.map((b: BucketTuple, i: number) => (
        <TableRow key={i}>
          <TableCell>{bucketRangeString(b)}</TableCell>
          <TableCell>{b[3]}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);
