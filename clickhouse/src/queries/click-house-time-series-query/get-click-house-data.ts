// Copyright 2025 The Perses Authors
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

import { Labels, TimeSeries } from '@perses-dev/core';
import { TimeSeriesQueryPlugin, replaceVariables } from '@perses-dev/plugin-system';
import { ClickHouseTimeSeriesQuerySpec } from './click-house-query-types';
import { DEFAULT_DATASOURCE } from '../constants';
import { ClickHouseClient, ClickHouseQueryResponse } from '../../model/click-house-client';
import { replaceClickHouseBuiltinVariables } from './replace-click-house-builtin-variables';

// Default minimum step in milliseconds (15 seconds)
const DEFAULT_MIN_STEP_MS = 15 * 1000;

// Calculate step based on time range, aiming for ~1000 data points
function calculateStep(start: Date, end: Date, suggestedStepMs?: number): number {
  const rangeMs = end.getTime() - start.getTime();
  const calculatedStep = Math.ceil(rangeMs / 1000);
  const step = Math.max(calculatedStep, DEFAULT_MIN_STEP_MS);
  return suggestedStepMs ? Math.max(step, suggestedStepMs) : step;
}

// Fixed column names - queries must alias their columns to these names
const TIMESTAMP_COLUMN = 'time';
const VALUE_COLUMN = 'value';

// Build labels from all columns except timestamp and value
function buildLabels(row: Record<string, unknown>, timestampCol: string, valueCol: string): Labels {
  const labels: Labels = {};
  for (const [key, value] of Object.entries(row)) {
    if (key !== timestampCol && key !== valueCol) {
      labels[key] = value === null || value === undefined ? '' : String(value);
    }
  }
  return labels;
}

// Create a unique key from labels for grouping
function labelsToKey(labels: Labels): string {
  return Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(',');
}

// Create a display name from labels
function labelsToName(labels: Labels): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) return 'series';
  if (entries.length === 1) return entries[0]?.[1] ?? 'series';
  return entries.map(([k, v]) => `${k}="${v}"`).join(', ');
}

function buildTimeSeries(response: ClickHouseQueryResponse | undefined): TimeSeries[] {
  if (!response || !response.data || response.data.length === 0) {
    return [];
  }

  const data = response.data as Record<string, unknown>[];

  // Group rows by their label combination
  const seriesMap = new Map<string, { labels: Labels; values: Array<[number, number]> }>();

  for (const row of data) {
    const labels = buildLabels(row, TIMESTAMP_COLUMN, VALUE_COLUMN);
    const key = labelsToKey(labels);

    // Parse timestamp
    const rawTime = row[TIMESTAMP_COLUMN];
    let timestamp: number;
    if (typeof rawTime === 'number') {
      timestamp = rawTime > 1e12 ? rawTime : rawTime * 1000; // Handle seconds vs ms
    } else {
      timestamp = new Date(String(rawTime)).getTime();
    }

    // Parse value
    const rawValue = row[VALUE_COLUMN];
    const value = typeof rawValue === 'number' ? rawValue : Number(rawValue) || 0;

    if (!seriesMap.has(key)) {
      seriesMap.set(key, { labels, values: [] });
    }
    seriesMap.get(key)!.values.push([timestamp, value]);
  }

  // Convert map to array of TimeSeries
  const result: TimeSeries[] = [];
  for (const { labels, values } of seriesMap.values()) {
    // Sort values by timestamp
    values.sort((a, b) => a[0] - b[0]);

    result.push({
      name: labelsToName(labels),
      labels,
      values,
    });
  }

  return result;
}

export const getTimeSeriesData: TimeSeriesQueryPlugin<ClickHouseTimeSeriesQuerySpec>['getTimeSeriesData'] = async (
  spec,
  context
) => {
  if (spec.query === undefined || spec.query === null || spec.query === '') {
    return { series: [] };
  }

  const { start, end } = context.timeRange;
  const stepMs = calculateStep(start, end, context.suggestedStepMs);

  // Replace built-in variables first, then user-defined variables
  let query = replaceClickHouseBuiltinVariables(spec.query, start, end, stepMs);
  query = replaceVariables(query, context.variableState);

  const client = (await context.datasourceStore.getDatasourceClient(
    spec.datasource ?? DEFAULT_DATASOURCE
  )) as ClickHouseClient;

  const response: ClickHouseQueryResponse = await client.query({
    query,
  });

  return {
    series: buildTimeSeries(response),
    timeRange: { start, end },
    stepMs,
    metadata: {
      executedQueryString: query,
    },
  };
};
