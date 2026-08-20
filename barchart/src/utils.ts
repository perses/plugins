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

import { SortOption } from '@perses-dev/components';

import { ColorOverride, DEFAULT_SORT } from './bar-chart-model';
import { BarChartData } from './BarChartBase';

export function calculatePercentages(data: BarChartData[]): Array<{ label: string; value: number }> {
  const sum = data.reduce((accumulator, { value }) => accumulator + (value ?? 0), 0);
  return data.map((seriesData) => {
    const percentage = ((seriesData.value ?? 0) / sum) * 100;
    return {
      ...seriesData,
      value: percentage,
    };
  });
}

export function sortSeriesData(data: BarChartData[], sortOrder: SortOption = DEFAULT_SORT): BarChartData[] {
  if (sortOrder === 'asc') {
    // sort in ascending order by value
    return data.toSorted((a, b) => {
      if (a.value === null) {
        return 1;
      }
      if (b.value === null) {
        return -1;
      }
      if (a.value === b.value) {
        return 0;
      }
      return a.value < b.value ? 1 : -1;
    });
  } else {
    // sort in descending order by value
    return data.toSorted((a, b) => {
      if (a.value === null) {
        return -1;
      }
      if (b.value === null) {
        return 1;
      }
      if (a.value === b.value) {
        return 0;
      }
      return a.value < b.value ? -1 : 1;
    });
  }
}

/**
 * Returns the color of the first override whose regex matches the given name.
 * Invalid regex patterns are skipped. Returns undefined if no override matches.
 */
export function getOverrideColor(name: string, overrides?: ColorOverride[]): string | undefined {
  if (!overrides) return undefined;
  for (const override of overrides) {
    if (override.regex === '') {
      continue;
    }
    try {
      if (new RegExp(override.regex).test(name)) {
        return override.color;
      }
    } catch {
      // ignore invalid regex patterns
    }
  }
  return undefined;
}
