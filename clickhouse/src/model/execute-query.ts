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

import type { DatasourceStore, VariableStateMap } from '@perses-dev/plugin-system';
import { isVariableDatasource, parseVariables } from '@perses-dev/plugin-system';
import type { AbsoluteTimeRange, Notice } from '@perses-dev/spec';

import type { ClickHouseClient, ClickHouseQueryResponse } from './click-house-client';
import { MAX_ROWS } from './click-house-client';
import type { ClickHouseDatasourceSelectValue } from './click-house-selectors';
import { CLICKHOUSE_DATASOURCE_KIND, DEFAULT_CLICKHOUSE } from './click-house-selectors';
import { getDatasourceClient } from './datasource-client';
import { interpolateVariables } from './interpolation';
import { expandMacros, formatClickHouseDateTime, parseQueryVariables, replaceTimeRangePlaceholders } from './macros';
import { stripFormat } from './sql';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
// Round intervals, so that the buckets of a query start at round times and do not move with the width of a panel.
const INTERVALS = [
  SECOND,
  2 * SECOND,
  5 * SECOND,
  10 * SECOND,
  15 * SECOND,
  30 * SECOND,
  MINUTE,
  2 * MINUTE,
  5 * MINUTE,
  10 * MINUTE,
  15 * MINUTE,
  30 * MINUTE,
  HOUR,
  2 * HOUR,
  3 * HOUR,
  6 * HOUR,
  12 * HOUR,
  DAY,
  2 * DAY,
  7 * DAY,
  30 * DAY,
];
// Number of data points aimed for when the panel does not suggest a step.
const DEFAULT_POINTS = 300;

/** Fields shared by the specs of every ClickHouse query. */
export interface ClickHouseQuerySpec {
  datasource?: ClickHouseDatasourceSelectValue;
  query: string;
}

/** What a ClickHouse query needs from the context of the plugin running it. */
export interface ClickHouseQueryContext {
  datasourceStore: DatasourceStore;
  variableState: VariableStateMap;
  /** Time range of the query. Queries using time macros or placeholders fail without it. */
  timeRange?: AbsoluteTimeRange;
  /** Interval between two data points suggested by the panel, in milliseconds. */
  suggestedStepMs?: number;
  /** Lower bound of the interval of the query, in milliseconds. */
  minStepMs?: number;
}

export interface ExecutedQuery extends ClickHouseQueryResponse {
  /** The statement sent to ClickHouse, once the macros, placeholders and variables are replaced. */
  executedQueryString: string;
  /** Value of the interval macros, in milliseconds. */
  intervalMs: number;
}

/**
 * getIntervalMs returns the interval of the `$__interval_s` family of macros: the first round interval that is at
 * least the step suggested by the panel, or that splits the time range in a few hundred buckets. It is never shorter
 * than the min step of the query, rounded up to the second as the shortest interval is one second.
 */
export function getIntervalMs(
  timeRange: AbsoluteTimeRange | undefined,
  suggestedStepMs: number | undefined,
  minStepMs = 0,
): number {
  const rangeMs = timeRange ? timeRange.end.getTime() - timeRange.start.getTime() : 0;
  // A panel suggests a step of 0 until its width is known.
  const target = suggestedStepMs || rangeMs / DEFAULT_POINTS;
  const interval = INTERVALS.find((candidate) => candidate >= target) ?? Math.ceil(target / DAY) * DAY;
  return Math.max(interval, Math.ceil(minStepMs / SECOND) * SECOND);
}

/**
 * prepareQuery replaces the macros, the time range placeholders and the dashboard variables of a query. A final
 * `FORMAT` clause is dropped: the results are read in the format of the client.
 */
export function prepareQuery(sql: string, context: ClickHouseQueryContext): { sql: string; intervalMs: number } {
  const { timeRange, variableState } = context;
  const statement = stripFormat(sql);
  const intervalMs = getIntervalMs(timeRange, context.suggestedStepMs, context.minStepMs);
  let prepared = expandMacros(statement, { timeRange, intervalMs, variableState });
  if (timeRange) {
    prepared = replaceTimeRangePlaceholders(
      prepared,
      formatClickHouseDateTime(timeRange.start),
      formatClickHouseDateTime(timeRange.end),
    );
  }
  return { sql: interpolateVariables(prepared, variableState), intervalMs };
}

/** queryDependencies lists the dashboard variables a query depends on: the ones of its statements and datasource. */
export function queryDependencies(
  datasource: ClickHouseDatasourceSelectValue | undefined,
  ...statements: Array<string | undefined>
): { variables: string[] } {
  const variables = new Set<string>(isVariableDatasource(datasource) ? parseVariables(datasource) : []);
  for (const statement of statements) {
    for (const name of statement ? parseQueryVariables(statement) : []) {
      variables.add(name);
    }
  }
  return { variables: [...variables] };
}

/** getClickHouseClient returns the client of the datasource of a query, resolving a datasource variable. */
export function getClickHouseClient(
  datasource: ClickHouseDatasourceSelectValue | undefined,
  context: Pick<ClickHouseQueryContext, 'datasourceStore' | 'variableState'>,
): Promise<ClickHouseClient> {
  return getDatasourceClient<ClickHouseClient>(datasource, CLICKHOUSE_DATASOURCE_KIND, DEFAULT_CLICKHOUSE, context);
}

/** runStatement sends an already prepared statement to the datasource of a query. */
export async function runStatement(
  datasource: ClickHouseDatasourceSelectValue | undefined,
  sql: string,
  context: Pick<ClickHouseQueryContext, 'datasourceStore' | 'variableState'>,
  signal?: AbortSignal,
): Promise<ClickHouseQueryResponse> {
  const client = await getClickHouseClient(datasource, context);
  return client.query({ query: sql, signal });
}

/** executeQuery prepares a query, as written by the user, and runs it on its datasource. */
export async function executeQuery(
  spec: ClickHouseQuerySpec,
  context: ClickHouseQueryContext,
  signal?: AbortSignal,
): Promise<ExecutedQuery> {
  const { sql, intervalMs } = prepareQuery(spec.query, context);
  const response = await runStatement(spec.datasource, sql, context, signal);
  return { ...response, executedQueryString: sql, intervalMs };
}

/** truncationNotices warns that a result was cut. */
export function truncationNotices(response: Pick<ClickHouseQueryResponse, 'truncated'>): Notice[] {
  return response.truncated
    ? [{ type: 'warning', message: `Results were truncated to the first ${MAX_ROWS} rows.` }]
    : [];
}
