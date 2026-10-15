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

import type { TimeSeriesExemplars } from '@perses-dev/spec';
import { describe, expect, it } from 'vitest';

import {
  EXEMPLAR_SERIES_ID_PREFIX,
  findNearestTimestampIndex,
  getExemplarScatterSeries,
  getHeatMapExemplarData,
} from './data-transform';

const CATEGORIES = [0, 60_000, 120_000, 180_000, 240_000];

describe('findNearestTimestampIndex', () => {
  it('returns the index of the exact timestamp', () => {
    expect(findNearestTimestampIndex(CATEGORIES, 120_000)).toBe(2);
  });

  it('returns the closest category when the timestamp is between two', () => {
    // 100s is closer to 120s (index 2) than to 60s (index 1)
    expect(findNearestTimestampIndex(CATEGORIES, 100_000)).toBe(2);
    // 70s is closer to 60s (index 1)
    expect(findNearestTimestampIndex(CATEGORIES, 70_000)).toBe(1);
    // exactly in the middle rounds down
    expect(findNearestTimestampIndex(CATEGORIES, 90_000)).toBe(1);
  });

  it('returns -1 for timestamps outside the categories range', () => {
    expect(findNearestTimestampIndex(CATEGORIES, -1)).toBe(-1);
    expect(findNearestTimestampIndex(CATEGORIES, 240_001)).toBe(-1);
  });

  it('returns -1 for empty categories', () => {
    expect(findNearestTimestampIndex([], 1000)).toBe(-1);
  });
});

describe('getHeatMapExemplarData', () => {
  const groups: TimeSeriesExemplars[] = [
    {
      seriesLabels: { __name__: 'demo_request_duration_seconds', route: '/checkout' },
      exemplars: [
        { labels: { trace_id: 'trace-1' }, value: 0.42, timestamp: 61_000 },
        { labels: { trace_id: 'trace-2' }, value: 1.5, timestamp: 250_000 },
      ],
    },
    {
      seriesLabels: { route: '/api' },
      exemplars: [{ labels: { trace_id: 'trace-3' }, value: 0.05, timestamp: 119_000 }],
    },
  ];

  it('maps exemplars to the nearest category index and keeps the exemplar for the tooltip', () => {
    const items = getHeatMapExemplarData(groups, CATEGORIES);
    // trace-2 at 250s is out of the categories range, so only trace-1 and trace-3 remain
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      value: [1, 0.42],
      exemplar: { labels: { trace_id: 'trace-1' }, value: 0.42 },
      seriesLabels: { route: '/checkout' }, // __name__ stripped
    });
    expect(items[1]).toMatchObject({
      value: [2, 0.05],
      exemplar: { labels: { trace_id: 'trace-3' } },
      seriesLabels: { route: '/api' },
    });
  });

  it('drops exemplars outside the chart time range', () => {
    const items = getHeatMapExemplarData(groups, CATEGORIES);
    // trace-2 at 250s is past the last category (240s)
    expect(items.find((item) => item.exemplar.labels['trace_id'] === 'trace-2')).toBeUndefined();
  });

  it('returns an empty list for undefined groups or categories', () => {
    expect(getHeatMapExemplarData(undefined, CATEGORIES)).toEqual([]);
    expect(getHeatMapExemplarData(groups, [])).toEqual([]);
  });
});

describe('getExemplarScatterSeries', () => {
  it('builds a diamond scatter series with the exemplar series id and embedded metadata', () => {
    const items = getHeatMapExemplarData(
      [
        {
          seriesLabels: { route: '/api' },
          exemplars: [{ labels: { trace_id: 'trace-3' }, value: 0.05, timestamp: 119_000 }],
        },
      ],
      CATEGORIES,
    );
    const series = getExemplarScatterSeries(items);
    expect(series.id).toBe(`${EXEMPLAR_SERIES_ID_PREFIX}heatmap`);
    expect(series.type).toBe('scatter');
    expect(series.symbol).toBe('diamond');
    expect(series.data).toBe(items);
  });
});
