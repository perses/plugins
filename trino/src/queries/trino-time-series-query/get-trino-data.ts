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
import type { TimeSeriesQueryPlugin } from '@perses-dev/plugin-system';
import { replaceVariables } from '@perses-dev/plugin-system';
import type { Notice, TimeSeries } from '@perses-dev/spec';

import type { TrinoClient, TrinoRow } from '../../model/trino-client';
import {
  MAX_ROWS,
  formatTrinoDateTime,
  parseTrinoTimestamp,
  replaceTimeRangePlaceholders,
} from '../../model/trino-client';
import { DEFAULT_DATASOURCE } from '../constants';
import type { TrinoTimeSeriesQuerySpec } from './trino-query-types';

const DEFAULT_STEP_MS = 30 * 1000;
const TIME_COLUMN = 'time';

interface TimedRow {
  timestamp: number;
  row: TrinoRow;
}

function toTimedRows(rows: TrinoRow[]): TimedRow[] {
  return rows
    .map((row) => ({ timestamp: parseTrinoTimestamp(row[TIME_COLUMN]), row }))
    .filter(({ timestamp }) => Number.isFinite(timestamp));
}

function buildTimeSeries(rows: TimedRow[]): TimeSeries[] {
  const firstRow = rows[0]?.row;
  if (!firstRow) {
    return [];
  }

  const metricNames = Object.keys(firstRow).filter((key) => key !== TIME_COLUMN);

  return metricNames
    .map((metricName) => ({
      name: metricName,
      values: rows.map(({ timestamp, row }): [number, number | null] => [
        timestamp,
        toTimeSeriesValue(row[metricName]),
      ]),
    }))
    .filter((series) => series.values.some(([, value]) => value !== null));
}

function toTimeSeriesValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function inferStepMs(rows: TimedRow[]): number {
  const timestamps = rows.map(({ timestamp }) => timestamp).toSorted((a, b) => a - b);

  if (timestamps.length < 2) {
    return DEFAULT_STEP_MS;
  }

  const deltas: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    const previous = timestamps[i - 1];
    const current = timestamps[i];
    if (previous === undefined || current === undefined || current <= previous) {
      continue;
    }
    deltas.push(current - previous);
  }

  if (deltas.length === 0) {
    return DEFAULT_STEP_MS;
  }

  const deltaCounts = new Map<number, number>();
  for (const delta of deltas) {
    deltaCounts.set(delta, (deltaCounts.get(delta) ?? 0) + 1);
  }

  const inferredStep = Array.from(deltaCounts.entries()).toSorted(([deltaA, countA], [deltaB, countB]) => {
    if (countA !== countB) {
      return countB - countA;
    }
    return deltaB - deltaA;
  })[0]?.[0];

  return inferredStep ?? DEFAULT_STEP_MS;
}

export const getTimeSeriesData: TimeSeriesQueryPlugin<TrinoTimeSeriesQuerySpec>['getTimeSeriesData'] = async (
  spec,
  context,
  abortSignal,
) => {
  if (spec.query === undefined || spec.query === null || spec.query === '') {
    return { series: [] };
  }

  const query = replaceVariables(spec.query, context.variableState);

  const client = (await context.datasourceStore.getDatasourceClient(
    spec.datasource ?? DEFAULT_DATASOURCE,
  )) as TrinoClient;

  const { start, end } = context.timeRange;
  const startTime = formatTrinoDateTime(start);
  const endTime = formatTrinoDateTime(end);
  const executedQueryString = replaceTimeRangePlaceholders(query, startTime, endTime);

  const response = await client.query({
    start: startTime,
    end: endTime,
    query: executedQueryString,
    catalog: spec.catalog,
    schema: spec.schema,
    sessionProperties: spec.sessionProperties,
    source: spec.source,
    routingGroup: spec.routingGroup,
    signal: abortSignal,
  });

  const rows = toTimedRows(response.data ?? []);
  const notices: Notice[] = [];
  if (response.truncated) {
    notices.push({ type: 'warning', message: `Results were truncated to the first ${MAX_ROWS} rows.` });
  }
  if (rows.length < (response.data?.length ?? 0)) {
    notices.push({
      type: 'warning',
      message: `Rows without a parseable "${TIME_COLUMN}" column were skipped.`,
    });
  }

  return {
    series: buildTimeSeries(rows),
    timeRange: { start, end },
    stepMs: inferStepMs(rows),
    metadata: {
      executedQueryString,
      ...(notices.length > 0 && { notices }),
    },
  };
};
