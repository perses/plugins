// Copyright 2024 The Perses Authors
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

import { Fragment, ReactElement, ReactNode, useMemo } from 'react';
import { Alert, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { TimeSeries, TimeSeriesData, BucketTuple, TimeSeriesHistogramTuple, HistogramValue } from '@perses-dev/core';
import { PanelData } from '@perses-dev/plugin-system';
import { SeriesName } from './SeriesName';
import { HistogramChart } from './HistogramChart';

const MAX_FORMATABLE_SERIES = 1000;

export interface DataTableProps {
  result: Array<PanelData<TimeSeriesData>>;
}

/**
 * Designed to display timeseries data in a prometheus like table format.
 * The first column will contain the metric name and label combination, and the second column will contain the values.
 * This is inspired by prometheus DataTable.
 * https://github.com/prometheus/prometheus/blob/2524a915915d7eb1b1207152d2e0ce5771193404/web/ui/react-app/src/pages/graph/DataTable.tsx
 * @param result timeseries query result
 * @constructor
 */
export const DataTable = ({ result }: DataTableProps): ReactElement | null => {
  const series = useMemo(() => result.flatMap((d) => d.data).flatMap((d) => d?.series || []), [result]);
  const rows = useMemo(() => buildRows(series), [series]);

  if (!result) {
    return <Typography>No data</Typography>;
  }

  return (
    <>
      {series.length >= MAX_FORMATABLE_SERIES && (
        <Alert severity="warning">
          Showing more than {MAX_FORMATABLE_SERIES} series, turning off label formatting for performance reasons.
        </Alert>
      )}
      <Table className="data-table">
        <TableBody>{rows}</TableBody>
      </Table>
    </>
  );
};

function buildRows(series: TimeSeries[]): ReactNode[] {
  const isFormatted = series.length < MAX_FORMATABLE_SERIES; // only format series names if we have less than 1000 series for performance reasons
  return series.map((s, seriesIdx) => {
    const displayTimeStamps = (s.values?.length ?? 0) > 1;
    const valuesAndTimes = s.values
      ? s.values.map((v, valIdx) => {
          return (
            <Typography key={valIdx}>
              {v[1]} {displayTimeStamps && <span>@{v[0]}</span>}
            </Typography>
          );
        })
      : [];
    const histogramsAndTimes = s.histograms
      ? s.histograms.map((h: TimeSeriesHistogramTuple, hisIdx: number) => {
          return (
            <Fragment key={-hisIdx}>
              <HistogramChart width={400} height={200} data={{ buckets: h[1].buckets! }} /> {/* TODO: calc size ? */}
              <Stack flexDirection="row" justifyContent="space-between">
                <Typography>Total count: {h[1].count}</Typography>
                <Typography>Sum: {h[1].sum}</Typography>
              </Stack>
              {histogramTable(h[1])}
            </Fragment>
          );
        })
      : [];
    return (
      <TableRow style={{ whiteSpace: 'pre' }} key={seriesIdx}>
        <TableCell>
          <SeriesName name={s.name} formattedName={s.formattedName} labels={s.labels} isFormatted={isFormatted} />
        </TableCell>
        <TableCell>{s.histograms ? histogramsAndTimes : valuesAndTimes}</TableCell>
      </TableRow>
    );
  });
}

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
