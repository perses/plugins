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

import { idealSeriesColumns, resolveAutoColumns } from './stat-chart-model';

describe('idealSeriesColumns', () => {
  it('matches ceil(sqrt(n))', () => {
    expect(idealSeriesColumns(1)).toBe(1);
    expect(idealSeriesColumns(2)).toBe(2);
    expect(idealSeriesColumns(4)).toBe(2);
    expect(idealSeriesColumns(6)).toBe(3);
    expect(idealSeriesColumns(9)).toBe(3);
    expect(idealSeriesColumns(10)).toBe(4);
  });
});

describe('resolveAutoColumns', () => {
  it('honors fixed seriesColumns', () => {
    expect(resolveAutoColumns(6, 8, 2)).toBe(2);
    expect(resolveAutoColumns(6, 8, 3)).toBe(3);
    expect(resolveAutoColumns(4, 10, 2)).toBe(2);
  });

  it('caps fixed columns at 12 and series count', () => {
    expect(resolveAutoColumns(5, 10, 20)).toBe(5);
    expect(resolveAutoColumns(20, 20, 20)).toBe(12);
  });

  it('prefers square matrix over wide single row', () => {
    // 4 series on a wide panel: width allows 8 cols, ideal is 2 → 2×2
    expect(resolveAutoColumns(4, 8)).toBe(2);
    // 6 series: ideal 3
    expect(resolveAutoColumns(6, 8)).toBe(3);
  });

  it('respects narrow panel width', () => {
    expect(resolveAutoColumns(10, 2)).toBe(2);
  });
});
