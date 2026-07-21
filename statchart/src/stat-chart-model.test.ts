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

import { CalculationType } from '@perses-dev/core';
import { createInitialStatChartOptions, getStatChartQueryMode, StatChartOptions } from './stat-chart-model';

function options(overrides: Partial<StatChartOptions> = {}): StatChartOptions {
  return {
    calculation: 'last-number',
    format: { unit: 'decimal' },
    ...overrides,
  };
}

describe('getStatChartQueryMode', () => {
  it('uses instant when there is no sparkline and the calculation only needs the latest point', () => {
    expect(getStatChartQueryMode(options({ calculation: 'last' }))).toBe('instant');
    expect(getStatChartQueryMode(options({ calculation: 'last-number' }))).toBe('instant');
  });

  // Regression: requesting instant unconditionally broke the sparkline, which draws the
  // series itself. See perses/plugins#738, which was reverted for this reason.
  it('uses range whenever a sparkline is configured', () => {
    expect(getStatChartQueryMode(options({ sparkline: {} }))).toBe('range');
    expect(getStatChartQueryMode(options({ sparkline: { color: '#fff', width: 2 } }))).toBe('range');
    // even for a calculation that would otherwise be instant
    expect(getStatChartQueryMode(options({ calculation: 'last', sparkline: {} }))).toBe('range');
  });

  it.each<CalculationType>(['mean', 'sum', 'min', 'max', 'first', 'first-number'])(
    'uses range for %s, which aggregates over the whole series',
    (calculation) => {
      expect(getStatChartQueryMode(options({ calculation }))).toBe('range');
    }
  );

  it('uses range for the default options, which enable the sparkline', () => {
    expect(getStatChartQueryMode(createInitialStatChartOptions())).toBe('range');
  });
});
