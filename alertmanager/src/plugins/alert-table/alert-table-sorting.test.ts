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
import { compareAlertsByColumn, compareGroupsByColumn, SortState } from './alert-table-sorting';

const makeAlert = (labels: Record<string, string>): Alert => ({
  id: 'fp',
  name: labels['alertname'] ?? '',
  state: 'firing',
  labels,
  annotations: {},
  startsAt: '2024-01-01T00:00:00Z',
  endsAt: '2024-01-01T01:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  receivers: [],
});

describe('compareAlertsByColumn', () => {
  it('sorts alphabetically ascending', () => {
    const sort: SortState = { columnName: 'severity', direction: 'asc', mode: 'alphabetical' };
    const a = makeAlert({ severity: 'critical' });
    const b = makeAlert({ severity: 'warning' });

    expect(compareAlertsByColumn(a, b, sort)).toBeLessThan(0);
  });

  it('sorts alphabetically descending', () => {
    const sort: SortState = { columnName: 'severity', direction: 'desc', mode: 'alphabetical' };
    const a = makeAlert({ severity: 'critical' });
    const b = makeAlert({ severity: 'warning' });

    expect(compareAlertsByColumn(a, b, sort)).toBeGreaterThan(0);
  });

  it('sorts numerically ascending', () => {
    const sort: SortState = { columnName: 'count', direction: 'asc', mode: 'numeric' };
    const a = makeAlert({ count: '5' });
    const b = makeAlert({ count: '20' });

    expect(compareAlertsByColumn(a, b, sort)).toBeLessThan(0);
  });

  it('sorts numerically descending', () => {
    const sort: SortState = { columnName: 'count', direction: 'desc', mode: 'numeric' };
    const a = makeAlert({ count: '5' });
    const b = makeAlert({ count: '20' });

    expect(compareAlertsByColumn(a, b, sort)).toBeGreaterThan(0);
  });

  it('sorts by severity weight ascending (critical before warning)', () => {
    const sort: SortState = { columnName: 'severity', direction: 'asc', mode: 'severity' };
    const a = makeAlert({ severity: 'critical' });
    const b = makeAlert({ severity: 'warning' });

    expect(compareAlertsByColumn(a, b, sort)).toBeLessThan(0);
  });

  it('sorts by severity weight descending (warning before critical)', () => {
    const sort: SortState = { columnName: 'severity', direction: 'desc', mode: 'severity' };
    const a = makeAlert({ severity: 'critical' });
    const b = makeAlert({ severity: 'warning' });

    expect(compareAlertsByColumn(a, b, sort)).toBeGreaterThan(0);
  });

  it('pushes undefined values to the end', () => {
    const sort: SortState = { columnName: 'severity', direction: 'asc', mode: 'alphabetical' };
    const a = makeAlert({});
    const b = makeAlert({ severity: 'warning' });

    expect(compareAlertsByColumn(a, b, sort)).toBeGreaterThan(0);
  });
});

describe('compareGroupsByColumn', () => {
  it('returns 0 for two empty counts', () => {
    const sort: SortState = { columnName: 'severity', direction: 'asc', mode: 'alphabetical' };
    expect(compareGroupsByColumn(undefined, undefined, sort)).toBe(0);
  });

  it('pushes empty counts to the end', () => {
    const sort: SortState = { columnName: 'severity', direction: 'asc', mode: 'alphabetical' };
    expect(compareGroupsByColumn(undefined, { critical: 1 }, sort)).toBeGreaterThan(0);
    expect(compareGroupsByColumn({ critical: 1 }, undefined, sort)).toBeLessThan(0);
  });

  it('sorts by severity mode using most critical value', () => {
    const sort: SortState = { columnName: 'severity', direction: 'asc', mode: 'severity' };
    const aCounts = { critical: 2 };
    const bCounts = { warning: 5 };

    expect(compareGroupsByColumn(aCounts, bCounts, sort)).toBeLessThan(0);
  });
});
