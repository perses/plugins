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

import { resolveSeriesColumns } from './stat-chart-model';

describe('resolveSeriesColumns', () => {
  it('single series always 1 col', () => {
    expect(resolveSeriesColumns(1, 'auto')).toBe(1);
    expect(resolveSeriesColumns(1, 'grid', 3)).toBe(1);
    expect(resolveSeriesColumns(1, 'row')).toBe(1);
  });

  it('auto picks matrix from count', () => {
    expect(resolveSeriesColumns(2, 'auto')).toBe(2);
    expect(resolveSeriesColumns(3, 'auto')).toBe(2);
    expect(resolveSeriesColumns(4, 'auto')).toBe(2); // 2×2
    expect(resolveSeriesColumns(5, 'auto')).toBe(3);
    expect(resolveSeriesColumns(6, 'auto')).toBe(3); // 3×2
    expect(resolveSeriesColumns(9, 'auto')).toBe(3); // 3×3
  });

  it('row uses full series count as columns', () => {
    expect(resolveSeriesColumns(4, 'row')).toBe(4);
  });

  it('grid honors fixed seriesColumns', () => {
    expect(resolveSeriesColumns(6, 'grid', 2)).toBe(2); // 2×3
    expect(resolveSeriesColumns(6, 'grid', 3)).toBe(3);
    expect(resolveSeriesColumns(4, 'grid', 2)).toBe(2);
  });

  it('grid without columns falls back to auto', () => {
    expect(resolveSeriesColumns(4, 'grid')).toBe(2);
  });

  it('auto large N uses ceil(sqrt(n))', () => {
    expect(resolveSeriesColumns(10, 'auto')).toBe(4); // ceil(sqrt(10))=4 → ~3×4
    expect(resolveSeriesColumns(16, 'auto')).toBe(4);
  });

  it('grid columns capped at 12', () => {
    expect(resolveSeriesColumns(20, 'grid', 20)).toBe(12);
  });

  // Matrix shape helpers for docs / PR examples
  it('documents common farm traffic matrices', () => {
    // 4 stacks → 2×2
    const cols4 = resolveSeriesColumns(4, 'grid', 2);
    expect(cols4).toBe(2);
    expect(Math.ceil(4 / cols4)).toBe(2);
    // 6 stacks → 2×3 or 3×2
    expect(Math.ceil(6 / resolveSeriesColumns(6, 'grid', 2))).toBe(3);
    expect(Math.ceil(6 / resolveSeriesColumns(6, 'grid', 3))).toBe(2);
  });
});
