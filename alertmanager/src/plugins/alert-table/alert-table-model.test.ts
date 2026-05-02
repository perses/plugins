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
import { deduplicateAlerts, extractLabelKeys, getGroupKey, getGroupSummary } from './alert-table-model';

const makeAlert = (overrides: Partial<Alert> = {}): Alert => ({
  id: 'abc123',
  name: 'TestAlert',
  state: 'firing',
  labels: { alertname: 'TestAlert', severity: 'critical' },
  annotations: {},
  severity: 'critical',
  startsAt: '2024-01-01T00:00:00Z',
  endsAt: '2024-01-01T01:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  receivers: [],
  ...overrides,
});

describe('deduplicateAlerts', () => {
  it('deduplicates alerts with the same fingerprint', () => {
    const alerts: Alert[] = [
      makeAlert({ id: 'fp1', labels: { alertname: 'A', severity: 'critical' } }),
      makeAlert({ id: 'fp1', labels: { alertname: 'A', severity: 'critical' } }),
      makeAlert({ id: 'fp2', labels: { alertname: 'B', severity: 'warning' } }),
    ];

    const result = deduplicateAlerts(alerts, { mode: 'fingerprint' });
    expect(result.alerts).toHaveLength(2);
  });

  it('deduplicates by specified labels', () => {
    const alerts: Alert[] = [
      makeAlert({ id: 'fp1', labels: { alertname: 'A', severity: 'critical', instance: 'a' } }),
      makeAlert({ id: 'fp2', labels: { alertname: 'A', severity: 'critical', instance: 'b' } }),
      makeAlert({ id: 'fp3', labels: { alertname: 'B', severity: 'warning', instance: 'a' } }),
    ];

    const result = deduplicateAlerts(alerts, { mode: 'labels', labels: ['alertname', 'severity'] });
    expect(result.alerts).toHaveLength(2);
  });

  it('returns all alerts when all fingerprints are unique', () => {
    const alerts: Alert[] = [makeAlert({ id: 'fp1' }), makeAlert({ id: 'fp2' }), makeAlert({ id: 'fp3' })];

    const result = deduplicateAlerts(alerts, { mode: 'fingerprint' });
    expect(result.alerts).toHaveLength(3);
    expect(result.duplicateCounts.size).toBe(0);
  });

  it('returns empty result for empty input', () => {
    const result = deduplicateAlerts([], { mode: 'fingerprint' });
    expect(result.alerts).toEqual([]);
    expect(result.duplicateCounts.size).toBe(0);
  });

  it('deduplicates alerts with same fingerprint by falling back to labels', () => {
    const alerts: Alert[] = [
      makeAlert({ id: '', labels: { alertname: 'A', severity: 'critical' } }),
      makeAlert({ id: '', labels: { alertname: 'B', severity: 'warning' } }),
    ];

    const result = deduplicateAlerts(alerts, { mode: 'fingerprint' });
    expect(result.alerts).toHaveLength(2);
  });

  it('deduplicates alerts with identical labels when fingerprints are empty', () => {
    const alerts: Alert[] = [
      makeAlert({ id: '', labels: { alertname: 'A', severity: 'critical' } }),
      makeAlert({ id: '', labels: { alertname: 'A', severity: 'critical' } }),
    ];

    const result = deduplicateAlerts(alerts, { mode: 'fingerprint' });
    expect(result.alerts).toHaveLength(1);
  });

  it('tracks duplicate counts per alert', () => {
    const alerts: Alert[] = [
      makeAlert({ id: 'fp1' }),
      makeAlert({ id: 'fp1' }),
      makeAlert({ id: 'fp1' }),
      makeAlert({ id: 'fp2' }),
    ];

    const result = deduplicateAlerts(alerts, { mode: 'fingerprint' });
    expect(result.alerts).toHaveLength(2);
    expect(result.duplicateCounts.get(result.alerts[0]!)).toBe(3);
    expect(result.duplicateCounts.has(result.alerts[1]!)).toBe(false);
  });
});

describe('extractLabelKeys', () => {
  it('extracts all unique label keys from alerts', () => {
    const alerts: Alert[] = [
      makeAlert({ labels: { alertname: 'A', severity: 'critical' } }),
      makeAlert({ labels: { alertname: 'B', instance: 'server-1' } }),
    ];

    const keys = extractLabelKeys(alerts);
    expect(keys).toEqual(expect.arrayContaining(['alertname', 'severity', 'instance']));
    expect(keys).toHaveLength(3);
  });

  it('returns empty array for empty alerts', () => {
    expect(extractLabelKeys([])).toEqual([]);
  });
});

describe('getGroupKey', () => {
  it('builds group key from specified labels', () => {
    const alert = makeAlert({ labels: { alertname: 'HighMemory', severity: 'critical', instance: 'a' } });
    const key = getGroupKey(alert, ['alertname', 'severity']);
    expect(key).toBe('alertname=HighMemory,severity=critical');
  });

  it('uses empty string for missing labels', () => {
    const alert = makeAlert({ labels: { alertname: 'Test' } });
    const key = getGroupKey(alert, ['alertname', 'missing']);
    expect(key).toBe('alertname=Test,missing=');
  });

  it('returns empty string for no group-by labels', () => {
    const alert = makeAlert();
    const key = getGroupKey(alert, []);
    expect(key).toBe('');
  });
});

describe('getGroupSummary', () => {
  it('counts alerts by state', () => {
    const alerts: Alert[] = [
      makeAlert({ state: 'firing' }),
      makeAlert({ state: 'firing' }),
      makeAlert({ state: 'firing', suppressed: true }),
      makeAlert({ state: 'pending' }),
    ];

    const summary = getGroupSummary(alerts);
    expect(summary).toEqual({
      total: 4,
      firing: 2,
      suppressed: 1,
      pending: 1,
    });
  });

  it('handles empty group', () => {
    const summary = getGroupSummary([]);
    expect(summary).toEqual({
      total: 0,
      firing: 0,
      suppressed: 0,
      pending: 0,
    });
  });

  it('computes labelCounts when labelKeys are provided', () => {
    const alerts: Alert[] = [
      makeAlert({
        state: 'firing',
        labels: { alertname: 'A', severity: 'critical' },
      }),
      makeAlert({
        state: 'firing',
        labels: { alertname: 'B', severity: 'warning' },
      }),
      makeAlert({
        state: 'firing',
        suppressed: true,
        labels: { alertname: 'A', severity: 'critical' },
      }),
    ];

    const summary = getGroupSummary(alerts, ['severity']);
    expect(summary.total).toBe(3);
    expect(summary.firing).toBe(2);
    expect(summary.suppressed).toBe(1);
    expect(summary.labelCounts).toEqual({
      severity: { critical: 2, warning: 1 },
    });
  });
});
