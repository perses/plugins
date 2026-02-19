// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the \"License\");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an \"AS IS\" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { QueryDefinition } from '@perses-dev/core';
import { parseVariables } from '@perses-dev/plugin-system';
import { getLokiLogData } from './get-loki-log-data';
import { LokiLogQueryEditor } from './LokiLogQueryEditor';
import { LokiLogQuerySpec } from './loki-log-query-types';
import { LogQueryPlugin } from './log-query-plugin-interface';

// Target number of bars for log volume histogram
const TARGET_HISTOGRAM_BARS = 40;

// Standard intervals for histogram calculations (in milliseconds)
const STANDARD_INTERVALS = [
  { ms: 1000, label: '1s' },
  { ms: 2000, label: '2s' },
  { ms: 5000, label: '5s' },
  { ms: 10000, label: '10s' },
  { ms: 15000, label: '15s' },
  { ms: 30000, label: '30s' },
  { ms: 60000, label: '1m' },
  { ms: 120000, label: '2m' },
  { ms: 300000, label: '5m' },
  { ms: 600000, label: '10m' },
  { ms: 900000, label: '15m' },
  { ms: 1800000, label: '30m' },
  { ms: 3600000, label: '1h' },
  { ms: 7200000, label: '2h' },
  { ms: 21600000, label: '6h' },
  { ms: 43200000, label: '12h' },
  { ms: 86400000, label: '1d' },
  { ms: 604800000, label: '7d' },
  { ms: 2592000000, label: '30d' },
] as const;

/**
 * Calculates an appropriate interval for log volume histograms based on time range.
 * Uses standard round intervals for better alignment with time-series data.
 */
function calculateVolumeInterval(timeRangeMs: number): string {
  // Prefer smallest interval that produces 20-100 bars (optimal range)
  for (const interval of STANDARD_INTERVALS) {
    const barCount = timeRangeMs / interval.ms;
    if (barCount >= 20 && barCount <= 100) {
      return interval.label;
    }
  }

  // Fallback: find closest to target if no interval fits optimal range
  let bestInterval = STANDARD_INTERVALS[STANDARD_INTERVALS.length - 1]!;
  let bestDistance = Infinity;
  for (const interval of STANDARD_INTERVALS) {
    const barCount = timeRangeMs / interval.ms;
    const distance = Math.abs(barCount - TARGET_HISTOGRAM_BARS);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestInterval = interval;
    }
  }

  return bestInterval.label;
}

export const LokiLogQuery: LogQueryPlugin<LokiLogQuerySpec> = {
  getLogData: getLokiLogData,
  OptionsEditorComponent: LokiLogQueryEditor,
  createInitialOptions: () => ({ query: '' }),
  dependsOn: (spec) => {
    const queryVariables = parseVariables(spec.query);
    const allVariables = [...new Set([...queryVariables])];
    return {
      variables: allVariables,
    };
  },
  createVolumeQuery: (spec: LokiLogQuerySpec, context?): QueryDefinition | null => {
    if (!spec.query || !spec.query.trim()) {
      return null;
    }

    const interval = context?.timeRange
      ? calculateVolumeInterval(context.timeRange.end.getTime() - context.timeRange.start.getTime())
      : '1m';

    const volumeQuery = `sum by (level, detected_level) (count_over_time(${spec.query}[${interval}]))`;

    return {
      kind: 'TimeSeriesQuery',
      spec: {
        plugin: {
          kind: 'LokiTimeSeriesQuery',
          spec: {
            query: volumeQuery,
            datasource: spec.datasource,
            step: interval,
          },
        },
      },
    };
  },
};
