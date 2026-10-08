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

import type { TimeSeriesQueryPlugin } from '@perses-dev/plugin-system';
import type { TimeSeries } from '@perses-dev/spec';

import type { ClickHouseClient, ClickHouseQueryResponse } from '../../model/click-house-client';
import type { ClickHouseTimeSeriesQuerySpec } from './click-house-query-types';
import { getTimeSeriesData } from './get-click-house-data';

type GetTimeSeriesData = TimeSeriesQueryPlugin<ClickHouseTimeSeriesQuerySpec>['getTimeSeriesData'];
type TimeSeriesQueryContext = Parameters<GetTimeSeriesData>[1];

const END = new Date('2026-01-01T01:00:00.000Z');
const START = new Date('2026-01-01T00:00:00.000Z');

// ClickHouse emits `2026-01-01 00:00:00`, which JavaScript parses as local time. Deriving the
// expectations from the same literal keeps the assertions independent of the runner's timezone.
const T0 = new Date('2026-01-01 00:00:00').getTime();
const T1 = new Date('2026-01-01 00:05:00').getTime();

function createContext(data: unknown): TimeSeriesQueryContext {
  const client: ClickHouseClient = {
    query: vi.fn(async (): Promise<ClickHouseQueryResponse> => ({ status: 'success', data })),
  };

  return {
    datasourceStore: {
      getDatasourceClient: vi.fn(async () => client),
    },
    timeRange: { start: START, end: END },
    variableState: {},
  } as unknown as TimeSeriesQueryContext;
}

async function run(data: unknown): Promise<{ series: TimeSeries[]; stepMs?: number }> {
  const result = await getTimeSeriesData({ query: 'SELECT 1' }, createContext(data));
  return { series: result.series, stepMs: result.stepMs };
}

describe('getTimeSeriesData', () => {
  it('keeps wide results unchanged: one series per numeric column', async () => {
    const { series } = await run([
      { time: '2026-01-01 00:00:00', value: 1 },
      { time: '2026-01-01 00:05:00', value: 2 },
    ]);

    expect(series).toEqual([
      {
        name: 'value',
        values: [
          [T0, 1],
          [T1, 2],
        ],
      },
    ]);
  });

  it('pivots a long-format result into one series per dimension value', async () => {
    const { series } = await run([
      { time: '2026-01-01 00:00:00', series: 'node-a', value: 1 },
      { time: '2026-01-01 00:00:00', series: 'node-b', value: 2 },
      { time: '2026-01-01 00:05:00', series: 'node-a', value: 3 },
      { time: '2026-01-01 00:05:00', series: 'node-b', value: 4 },
    ]);

    expect(series).toEqual([
      {
        name: 'series=node-a',
        labels: { series: 'node-a' },
        values: [
          [T0, 1],
          [T1, 3],
        ],
      },
      {
        name: 'series=node-b',
        labels: { series: 'node-b' },
        values: [
          [T0, 2],
          [T1, 4],
        ],
      },
    ]);
  });

  it('emits one series per dimension and value column when several values are selected', async () => {
    const { series } = await run([
      { time: '2026-01-01 00:00:00', series: 'node-a', p50: 1, p99: 10 },
      { time: '2026-01-01 00:00:00', series: 'node-b', p50: 2, p99: 20 },
    ]);

    expect(series).toEqual([
      { name: 'series=node-a p50', labels: { series: 'node-a', metric: 'p50' }, values: [[T0, 1]] },
      { name: 'series=node-a p99', labels: { series: 'node-a', metric: 'p99' }, values: [[T0, 10]] },
      { name: 'series=node-b p50', labels: { series: 'node-b', metric: 'p50' }, values: [[T0, 2]] },
      { name: 'series=node-b p99', labels: { series: 'node-b', metric: 'p99' }, values: [[T0, 20]] },
    ]);
  });

  it('keeps the column name as the series name for dimension-less multi-value results', async () => {
    const { series } = await run([
      { time: '2026-01-01 00:00:00', p50: 1, p99: 10 },
      { time: '2026-01-01 00:05:00', p50: 2, p99: 20 },
    ]);

    expect(series).toEqual([
      {
        name: 'p50',
        labels: { metric: 'p50' },
        values: [
          [T0, 1],
          [T1, 2],
        ],
      },
      {
        name: 'p99',
        labels: { metric: 'p99' },
        values: [
          [T0, 10],
          [T1, 20],
        ],
      },
    ]);
  });

  it('turns a result without a timestamp into one series per row carrying its dimensions', async () => {
    const { series } = await run([
      { repository: 'iac', jobs: 41 },
      { repository: 'cli', jobs: 7 },
    ]);

    expect(series).toEqual([
      { name: 'repository=iac', labels: { repository: 'iac' }, values: [[END.getTime(), 41]] },
      { name: 'repository=cli', labels: { repository: 'cli' }, values: [[END.getTime() + 1, 7]] },
    ]);
  });

  it('keeps a scalar result working for stat-style panels', async () => {
    const { series } = await run([{ total: 42 }]);

    expect(series).toEqual([{ name: 'total', values: [[END.getTime(), 42]] }]);
  });

  it('does not treat a non-timestamp `time` column as the timestamp', async () => {
    const { series } = await run([{ time: 'n/a', machine: 'node-a', value: 1 }]);

    expect(series).toEqual([
      { name: 'time=n/a,machine=node-a', labels: { time: 'n/a', machine: 'node-a' }, values: [[END.getTime(), 1]] },
    ]);
  });

  it('returns no series when the result holds no numeric column', async () => {
    const { series } = await run([{ time: '2026-01-01 00:00:00', machine: 'node-a' }]);

    expect(series).toEqual([]);
  });

  it('returns no series for an empty or non-array response', async () => {
    expect((await run([])).series).toEqual([]);
    expect((await run(undefined)).series).toEqual([]);
    expect((await run({ meta: [], rows: 0 })).series).toEqual([]);
  });

  it('infers the step from the timestamps of a long-format result', async () => {
    const { stepMs } = await run([
      { time: '2026-01-01 00:00:00', series: 'node-a', value: 1 },
      { time: '2026-01-01 00:00:00', series: 'node-b', value: 2 },
      { time: '2026-01-01 00:05:00', series: 'node-a', value: 3 },
      { time: '2026-01-01 00:05:00', series: 'node-b', value: 4 },
    ]);

    expect(stepMs).toBe(T1 - T0);
  });
});
