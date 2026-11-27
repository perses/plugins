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

import type { Alert, AlertState } from '@perses-dev/spec';

import type { ClickStackAlert } from '../../model/click-stack-client';

const STATES: Record<string, AlertState> = {
  ALERT: 'firing',
  PENDING: 'pending',
  OK: 'inactive',
};

const COMPARATORS: Record<string, string> = {
  above: '>=',
  above_exclusive: '>',
  below: '<',
  below_or_equal: '<=',
  equal: '=',
  not_equal: '!=',
};

// Labels set from the fields of an alert: a tag can not replace them.
const RESERVED_LABELS = new Set(['alertname', 'source', 'interval', 'group_by', 'tags']);
// A `key:value` tag whose key reads as a label name, e.g. `team:checkout`. It leaves out URLs and times.
const LABEL_TAG = /^([A-Za-z_][\w.-]*):(?!\/\/)(.+)$/;

export interface BuildAlertsOptions {
  /** URL of the ClickStack UI. Alerts have no link without it. */
  uiUrl?: string;
  /** Current time, in milliseconds: tells whether a silence is still active. */
  now: number;
}

function formatCondition(alert: ClickStackAlert): string | undefined {
  const { threshold, thresholdMax, thresholdType, interval, numConsecutiveWindows } = alert;
  if (typeof threshold !== 'number' || !thresholdType) return undefined;
  let condition: string;
  if (thresholdType === 'between' || thresholdType === 'not_between') {
    condition = `${thresholdType === 'between' ? 'between' : 'not between'} ${threshold} and ${thresholdMax ?? '?'}`;
  } else {
    condition = `${COMPARATORS[thresholdType] ?? thresholdType} ${threshold}`;
  }
  if (interval) condition += ` over ${interval}`;
  if (typeof numConsecutiveWindows === 'number' && numConsecutiveWindows > 1) {
    condition += `, for ${numConsecutiveWindows} consecutive windows`;
  }
  return condition;
}

function isHttpUrl(text: string): boolean {
  return /^https?:\/\/\S+$/i.test(text);
}

// Link to what the alert watches in the ClickStack UI, as ClickStack builds it.
function buildSourceUrl(alert: ClickStackAlert, uiUrl: string): string {
  const base = uiUrl.replace(/\/+$/, '');
  if (alert.source === 'tile' && alert.dashboardId) {
    const tile = alert.tileId ? `?highlightedTileId=${encodeURIComponent(alert.tileId)}` : '';
    return `${base}/dashboards/${encodeURIComponent(alert.dashboardId)}${tile}`;
  }
  if (alert.source === 'saved_search' && alert.savedSearchId) {
    return `${base}/search/${encodeURIComponent(alert.savedSearchId)}`;
  }
  if (alert.source === 'inline') {
    return `${base}/chart?alertId=${encodeURIComponent(alert.id)}`;
  }
  return `${base}/alerts`;
}

/**
 * buildAlert converts a ClickStack alert.
 *
 * - Its name is its display name: the `name` field of ClickStack is the title of its notifications.
 * - Its labels are its name (`alertname`), what it watches (`source`), its evaluation interval, its grouping, and
 *   its tags: a `key:value` tag is the label `key`, and the other tags are joined in the `tags` label.
 * - Its severity is its `severity` label, as ClickStack alerts have no severity of their own.
 * - A note that is a link is also its `runbook_url` annotation, the one alert tables open as a runbook.
 * - ClickStack does not tell when an alert started firing: `startsAt` is the time of its last evaluation.
 */
export function buildAlert(alert: ClickStackAlert, options: BuildAlertsOptions): Alert {
  const name = alert.displayName || alert.name || alert.id;
  const labels: Record<string, string> = { alertname: name };
  if (alert.source) labels.source = alert.source;
  if (alert.interval) labels.interval = alert.interval;
  if (alert.groupBy) labels.group_by = alert.groupBy;
  const otherTags: string[] = [];
  for (const tag of alert.tags ?? []) {
    const [, key, value] = LABEL_TAG.exec(tag.trim()) ?? [];
    if (key !== undefined && value !== undefined && value.trim() !== '' && !RESERVED_LABELS.has(key)) {
      labels[key] = value.trim();
    } else if (tag.trim() !== '') {
      otherTags.push(tag.trim());
    }
  }
  if (otherTags.length > 0) labels.tags = otherTags.join(',');

  const annotations: Record<string, string> = {};
  if (alert.message) annotations.message = alert.message;
  if (alert.note) {
    annotations.note = alert.note;
    if (isHttpUrl(alert.note.trim())) annotations.runbook_url = alert.note.trim();
  }
  if (alert.name && alert.name !== name) annotations.title = alert.name;
  const condition = formatCondition(alert);
  if (condition) annotations.condition = condition;
  const state = alert.state ? STATES[alert.state] : undefined;
  // A state the plugin does not know is shown as inactive: keep it readable.
  if (alert.state && state === undefined) annotations.clickstack_state = alert.state;
  const lastError = alert.executionErrors?.at(-1);
  if (lastError?.message) {
    annotations.error = lastError.type ? `${lastError.type}: ${lastError.message}` : lastError.message;
  }

  const lastEvaluation = alert.updatedAt || alert.createdAt || new Date(options.now).toISOString();
  const result: Alert = {
    id: alert.id,
    name,
    state: state ?? 'inactive',
    labels,
    annotations,
    startsAt: lastEvaluation,
    updatedAt: lastEvaluation,
  };
  if (labels.severity) result.severity = labels.severity;
  if (options.uiUrl) result.sourceURL = buildSourceUrl(alert, options.uiUrl);

  // A silence stays on the alert once over: only one that has not ended yet suppresses it.
  const silencedUntil = alert.silenced?.until ? Date.parse(alert.silenced.until) : NaN;
  if (silencedUntil > options.now) {
    result.suppressed = true;
    result.suppressedBy = [{ type: 'silence', id: alert.silenced?.by || alert.id }];
    annotations.silenced_until = new Date(silencedUntil).toISOString();
  }
  return result;
}

/** buildAlerts converts the alerts of ClickStack into the alerts Perses displays. */
export function buildAlerts(alerts: ClickStackAlert[], options: BuildAlertsOptions): Alert[] {
  return alerts.map((alert) => buildAlert(alert, options));
}
