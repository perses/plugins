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

import type { ProfileQueryContext } from '@perses-dev/plugin-system';

import { ClickHouseError } from '../../model/click-house-client';
import type { StubClient } from '../../test/stubs';
import { stubClient, stubDatasourceStore, stubResponse } from '../../test/stubs';
import { ClickHouseProfileQuery } from './ClickHouseProfileQuery';
import { buildProfile, buildTimeline } from './profile';

function createContext(client: StubClient): ProfileQueryContext {
  return {
    datasourceStore: stubDatasourceStore(client),
    absoluteTimeRange: {
      start: new Date('2026-01-01T10:00:00.000Z'),
      end: new Date('2026-01-01T10:05:00.000Z'),
    },
  };
}

const FLAME = stubResponse(
  [
    ['stack', 'Array(String)'],
    ['samples', 'UInt64'],
    ['sum(value)', 'Int64'],
    ['any(name)', 'String'],
    ['any(unit)', 'String'],
  ],
  [
    // Frames come from the leaf to the root, as in the OpenTelemetry profiles.
    [['c', 'b', 'a'], '2', '10', 'cpu', 'ns'],
    [['', 'a'], '1', '5', 'cpu', 'ns'],
  ],
);

const TIMELINE = stubResponse(
  [
    ['toUnixTimestamp(toStartOfInterval(toDateTime(time), toIntervalSecond(1)))', 'UInt32'],
    ['samples', 'UInt64'],
    ['sum(value)', 'Int64'],
  ],
  [
    [1767261600, '2', '10'],
    [1767261602, '1', '5'],
  ],
);

describe('buildProfile', () => {
  it('merges the stacks into a flame graph rooted at their outermost frame', () => {
    expect(buildProfile(FLAME)).toEqual({
      numTicks: 15,
      maxSelf: 10,
      name: 'cpu',
      units: 'nanoseconds',
      stackTrace: {
        id: 1,
        name: 'total',
        level: 0,
        start: 0,
        end: 15,
        total: 15,
        self: 0,
        children: [
          {
            id: 2,
            name: 'a',
            level: 1,
            start: 0,
            end: 15,
            total: 15,
            self: 0,
            children: [
              // Frames without a name are kept: they hold a share of the profile.
              { id: 3, name: '[unknown]', level: 2, start: 0, end: 5, total: 5, self: 5, children: [] },
              {
                id: 4,
                name: 'b',
                level: 2,
                start: 5,
                end: 15,
                total: 10,
                self: 0,
                children: [{ id: 5, name: 'c', level: 3, start: 5, end: 15, total: 10, self: 10, children: [] }],
              },
            ],
          },
        ],
      },
    });
  });

  it('counts the samples when they have no value', () => {
    const profile = buildProfile(
      stubResponse(
        [
          ['stack', 'Array(String)'],
          ['samples', 'UInt64'],
        ],
        [[['a'], '3']],
      ),
    );

    expect(profile.numTicks).toBe(3);
    expect(profile.units).toBe('count');
  });

  it('is an empty profile, which the flame chart tells by its root, when there is no sample', () => {
    expect(buildProfile(stubResponse([['stack', 'Array(String)']])).stackTrace).toMatchObject({ id: 0, total: 0 });
  });
});

describe('buildTimeline', () => {
  const start = Date.UTC(2026, 0, 1, 10);

  it('fills the buckets of the time range, with 0 where there is no sample', () => {
    expect(buildTimeline(TIMELINE, start, start + 3000, 1)).toEqual({
      startTime: start / 1000,
      durationDelta: 1,
      samples: [10, 0, 5, 0],
    });
  });

  it('has no samples when the query returns no time column', () => {
    const totals = stubResponse([['samples', 'UInt64']], [['3']]);

    expect(buildTimeline(totals, start, start + 3000, 1).samples).toEqual([]);
  });
});

describe('ClickHouseProfileQuery', () => {
  it('aggregates the samples of the query by stack and by time bucket', async () => {
    const client = stubClient((sql) => (sql.includes('GROUP BY stack') ? FLAME : TIMELINE));

    const response = await ClickHouseProfileQuery.getProfileData(
      { query: 'SELECT Timestamp AS time, FunctionNames AS stack FROM otel_profiles WHERE $__timeFilter(Timestamp)' },
      createContext(client),
    );

    const samples =
      'FROM (\nSELECT Timestamp AS time, FunctionNames AS stack FROM otel_profiles WHERE (Timestamp >= toDateTime(1767261600) AND Timestamp <= toDateTime(1767261900))\n)';
    expect(client.statements()).toEqual([
      [
        "SELECT stack, count() AS samples, COLUMNS('(?i)^value$') APPLY sum, COLUMNS('(?i)^(name|unit)$') APPLY any",
        samples,
        'GROUP BY stack',
      ].join('\n'),
      [
        "SELECT COLUMNS('(?i)^time$') APPLY (t -> toUnixTimestamp(toStartOfInterval(toDateTime(t), INTERVAL 1 second))), count() AS samples, COLUMNS('(?i)^value$') APPLY sum",
        samples,
        'GROUP BY ALL',
      ].join('\n'),
    ]);
    expect(response.numTicks).toBe(15);
    expect(response.metadata).toMatchObject({ name: 'cpu', units: 'nanoseconds' });
    expect(response.timeline?.samples.slice(0, 3)).toEqual([10, 0, 5]);
  });

  it('warns that dashboard variables are not replaced', async () => {
    const client = stubClient((sql) => (sql.includes('GROUP BY stack') ? FLAME : TIMELINE));

    const response = await ClickHouseProfileQuery.getProfileData(
      { query: 'SELECT FunctionNames AS stack FROM otel_profiles WHERE ServiceName = ${service:sqlstring}' },
      createContext(client),
    );

    expect(response.metadata?.notices).toEqual([
      {
        type: 'warning',
        message: 'Dashboard variables are not available to profile queries: $service is sent as is.',
      },
    ]);
  });

  it('refuses a datasource variable, which it can not resolve', async () => {
    const client = stubClient((sql) => (sql.includes('GROUP BY stack') ? FLAME : TIMELINE));

    await expect(
      ClickHouseProfileQuery.getProfileData(
        { datasource: '$ds', query: 'SELECT FunctionNames AS stack FROM otel_profiles' },
        createContext(client),
      ),
    ).rejects.toThrow(/select a datasource instead of \$ds/);
    expect(client.statements()).toEqual([]);
  });

  it('tells which column a profile query must return', async () => {
    const client = stubClient((sql) => {
      // Only the flame graph reads the stacks.
      if (!sql.includes('GROUP BY stack')) return stubResponse([['samples', 'UInt64']], [['1']]);
      throw new ClickHouseError('ClickHouse query failed: Unknown expression identifier `stack`', { code: 47 });
    });

    await expect(
      ClickHouseProfileQuery.getProfileData({ query: 'SELECT 1 AS x' }, createContext(client)),
    ).rejects.toThrow(/must return a "stack" column/);
  });
});
