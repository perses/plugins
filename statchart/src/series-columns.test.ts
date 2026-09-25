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

import { describe, expect, it } from 'vitest';

import { computeIdealSeriesColumns, MAX_SERIES_COLUMNS, resolveAutoOrientationColumnsCount } from './stat-chart-model';

describe('computeIdealSeriesColumns', () => {
  it('matches ceil(sqrt(n))', () => {
    expect(computeIdealSeriesColumns(1)).toBe(1);
    expect(computeIdealSeriesColumns(2)).toBe(2);
    expect(computeIdealSeriesColumns(4)).toBe(2);
    expect(computeIdealSeriesColumns(6)).toBe(3);
    expect(computeIdealSeriesColumns(9)).toBe(3);
    expect(computeIdealSeriesColumns(10)).toBe(4);
  });
});

describe('resolveAutoOrientationColumnsCount', () => {
  it('honors max seriesColumns', () => {
    expect(resolveAutoOrientationColumnsCount(6, 8, 2)).toBe(2);
    expect(resolveAutoOrientationColumnsCount(6, 8, 3)).toBe(3);
    expect(resolveAutoOrientationColumnsCount(4, 10, 2)).toBe(2);
  });

  it('caps fixed columns at MAX_SERIES_COLUMNS and series count', () => {
    expect(resolveAutoOrientationColumnsCount(5, 10, 20)).toBe(5);
    expect(resolveAutoOrientationColumnsCount(20, 20, 20)).toBe(MAX_SERIES_COLUMNS);
  });

  it('prefers square matrix over wide single row', () => {
    expect(resolveAutoOrientationColumnsCount(4, 8)).toBe(2);
    expect(resolveAutoOrientationColumnsCount(6, 8)).toBe(3);
  });

  it('respects narrow panel width', () => {
    expect(resolveAutoOrientationColumnsCount(10, 2)).toBe(2);
  });
});
