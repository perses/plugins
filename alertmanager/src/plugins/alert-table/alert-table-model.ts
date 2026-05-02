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

import { Alert } from '@perses-dev/spec';

/**
 * Configuration for how alerts should be deduplicated across datasources.
 */
export interface AlertDeduplicationConfig {
  mode: 'none' | 'fingerprint' | 'labels';
  labels?: string[];
}

export interface DeduplicationResult {
  alerts: Alert[];
  duplicateCounts: Map<Alert, number>;
}

export type AlertAction = 'silence' | 'runbook';

export const ALL_ALERT_ACTIONS: AlertAction[] = ['silence', 'runbook'];

export interface LabelColorOverride {
  value: string;
  isRegex: boolean;
  color: string;
}

export interface LabelColorMapping {
  labelKey: string;
  mode: 'auto' | 'severity' | 'manual';
  overrides?: LabelColorOverride[];
}

export type SortDirection = 'asc' | 'desc';

export type ColumnSortMode = 'alphabetical' | 'numeric' | 'severity';

export interface ColumnDefinition {
  name: string;
  header?: string;
  enableSorting?: boolean;
  sort?: SortDirection;
  sortMode?: ColumnSortMode;
}

/**
 * Options for the AlertTable panel plugin.
 */
export interface AlertTableOptions {
  defaultGroupBy?: string[];
  columns?: ColumnDefinition[];
  deduplication?: AlertDeduplicationConfig;
  allowedActions?: AlertAction[];
  labelColorMappings?: LabelColorMapping[];
}

/**
 * Summary of alert counts by state within a group.
 */
export interface GroupSummary {
  total: number;
  firing: number;
  suppressed: number;
  pending: number;
  labelCounts?: Record<string, Record<string, number>>;
}

/**
 * Deduplicate alerts based on the configured deduplication mode.
 * - 'fingerprint' (default): Uses the alert's fingerprint field.
 * - 'labels': Uses a combination of specified label values.
 */
export function deduplicateAlerts(alerts: Alert[], config: AlertDeduplicationConfig): DeduplicationResult {
  if (alerts.length === 0 || config.mode === 'none') return { alerts, duplicateCounts: new Map() };

  const seen = new Map<string, Alert>();
  const counts = new Map<string, number>();
  const result: Alert[] = [];

  for (const alert of alerts) {
    let key: string;
    if (config.mode === 'labels' && config.labels) {
      key = config.labels.map((l) => `${l}=${alert.labels[l] ?? ''}`).join(',');
    } else if (alert.id) {
      key = alert.id;
    } else {
      key = JSON.stringify(alert.labels);
    }

    if (!seen.has(key)) {
      seen.set(key, alert);
      counts.set(key, 1);
      result.push(alert);
    } else {
      counts.set(key, (counts.get(key) ?? 1) + 1);
    }
  }

  const duplicateCounts = new Map<Alert, number>();
  for (const [key, alert] of seen) {
    const count = counts.get(key) ?? 1;
    if (count > 1) {
      duplicateCounts.set(alert, count);
    }
  }

  return { alerts: result, duplicateCounts };
}

/**
 * Extract all unique label keys from a list of alerts.
 */
export function extractLabelKeys(alerts: Alert[]): string[] {
  const keys = new Set<string>();
  for (const alert of alerts) {
    for (const key of Object.keys(alert.labels)) {
      keys.add(key);
    }
  }
  return Array.from(keys).sort();
}

/**
 * Build a group key string from an alert's labels and the specified group-by labels.
 */
export function getGroupKey(alert: Alert, groupBy: string[]): string {
  return groupBy.map((label) => `${label}=${alert.labels[label] ?? ''}`).join(',');
}

/**
 * Compute a summary of alert counts by state for a group of alerts.
 */
export function getGroupSummary(alerts: Alert[], labelKeys?: string[]): GroupSummary {
  const summary: GroupSummary = { total: 0, firing: 0, suppressed: 0, pending: 0 };
  const labelCounts: Record<string, Record<string, number>> = {};

  if (labelKeys) {
    for (const key of labelKeys) {
      labelCounts[key] = {};
    }
  }

  for (const alert of alerts) {
    summary.total++;
    if (alert.suppressed) {
      summary.suppressed++;
    } else {
      switch (alert.state) {
        case 'firing':
          summary.firing++;
          break;
        case 'pending':
          summary.pending++;
          break;
      }
    }

    if (labelKeys) {
      for (const key of labelKeys) {
        const labelValue = alert.labels[key];
        if (labelValue !== undefined) {
          const counts = labelCounts[key];
          if (counts) {
            counts[labelValue] = (counts[labelValue] ?? 0) + 1;
          }
        }
      }
    }
  }

  if (labelKeys && labelKeys.length > 0) {
    summary.labelCounts = labelCounts;
  }

  return summary;
}
