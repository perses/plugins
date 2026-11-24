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

import type { QuerySettingsOptions } from './time-series-chart-model';
import { resolveMultipleYAxisFormats } from './time-series-chart-model';

const queryUnitSettings: QuerySettingsOptions[] = [
  { queryIndex: 1, format: { unit: 'decbytes', shortValues: true } },
  { queryIndex: 2, format: { unit: 'decbits/sec' } },
  { queryIndex: 3, format: { unit: 'decbytes/sec' } },
  { queryIndex: 0, format: { unit: 'decbits' } },
];

describe('resolveMultipleYAxisFormats', () => {
  it('keeps an unformatted query on the left decimal axis', () => {
    const layout = resolveMultipleYAxisFormats(
      undefined,
      queryUnitSettings.filter((settings) => settings.queryIndex !== 0),
      4,
    );

    expect(layout.leftFormat.unit).toBe('decimal');
    expect(layout.formatToYAxisIndex.get('decimal')).toBe(0);
    expect(layout.additionalFormats.map((format) => format.unit)).toEqual(['decbytes', 'decbits/sec', 'decbytes/sec']);
  });

  it('moves the first query unit to the left when every query overrides the panel unit', () => {
    const layout = resolveMultipleYAxisFormats(undefined, queryUnitSettings, 4);

    expect(layout.leftFormat.unit).toBe('decbits');
    expect(layout.formatToYAxisIndex.get('decbits')).toBe(0);
    expect(layout.additionalFormats.map((format) => format.unit)).toEqual(['decbytes', 'decbits/sec', 'decbytes/sec']);
    expect(layout.formatToYAxisIndex.get('decbytes')).toBe(1);
    expect(layout.formatToYAxisIndex.get('decbytes/sec')).toBe(3);
  });

  it('keeps an explicit panel unit on the left when a query uses it', () => {
    const layout = resolveMultipleYAxisFormats(
      { unit: 'percent' },
      [{ queryIndex: 0, format: { unit: 'percent' } }],
      1,
    );

    expect(layout.leftFormat.unit).toBe('percent');
    expect(layout.additionalFormats).toEqual([]);
  });
});
