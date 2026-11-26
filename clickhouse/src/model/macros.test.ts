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

import { expandMacros, parseQueryVariables } from './macros';

const timeRange = { start: new Date('2026-01-01T00:00:00.500Z'), end: new Date('2026-01-01T01:00:00.500Z') };
const context = { timeRange, intervalMs: 60_000, variableState: {} };

describe('expandMacros', () => {
  it('filters on the time range, rounded outwards to the second', () => {
    expect(expandMacros('SELECT 1 WHERE $__timeFilter(Timestamp) AND x', context)).toBe(
      'SELECT 1 WHERE (Timestamp >= toDateTime(1767225600) AND Timestamp <= toDateTime(1767229201)) AND x',
    );
  });

  it('filters with millisecond precision', () => {
    expect(expandMacros('$__timeFilter_ms(ts)', context)).toBe(
      '(ts >= fromUnixTimestamp64Milli(1767225600500) AND ts <= fromUnixTimestamp64Milli(1767229200500))',
    );
  });

  it('filters on a date column and a time column', () => {
    expect(expandMacros('$__dateTimeFilter(d, t)', context)).toBe(
      "(d >= toDate('2026-01-01') AND d <= toDate('2026-01-01') AND t >= toDateTime(1767225600) AND t <= toDateTime(1767229201))",
    );
  });

  it('buckets on the interval and exposes it', () => {
    expect(expandMacros('SELECT $__timeInterval(Timestamp) AS time, count() / $__interval_s', context)).toBe(
      'SELECT toStartOfInterval(toDateTime(Timestamp), INTERVAL 60 second) AS time, count() / 60',
    );
    expect(expandMacros('$__interval_ms', context)).toBe('60000');
  });

  it('reads arguments holding parentheses, commas and strings', () => {
    expect(expandMacros("$__timeInterval(if(a = ')', toDateTime(b, 'UTC'), c))", context)).toBe(
      "toStartOfInterval(toDateTime(if(a = ')', toDateTime(b, 'UTC'), c)), INTERVAL 60 second)",
    );
  });

  it('drops a condition when "All" is selected', () => {
    const sql = 'WHERE $__conditionalAll(service IN (${service:sqlstring}), $service)';
    const selected = { service: { value: ['a', 'b'], loading: false } };
    const all = { service: { value: ['a', 'b'], loading: false, displayValue: 'All' } };

    expect(expandMacros(sql, { ...context, variableState: selected })).toBe('WHERE service IN (${service:sqlstring})');
    expect(expandMacros(sql, { ...context, variableState: all })).toBe('WHERE 1=1');
  });

  it('does not mistake a macro for the variable it starts like', () => {
    // $__fromTime starts like the $__from variable of Perses.
    expect(expandMacros('$__fromTime AND $__toTime_ms', context)).toBe(
      'toDateTime(1767225600) AND fromUnixTimestamp64Milli(1767229200500)',
    );
  });

  it('replaces the macros in the arguments of a macro', () => {
    expect(
      expandMacros('$__conditionalAll($__timeInterval(t) > $__fromTime, $service)', {
        ...context,
        variableState: { service: { value: 'a', loading: false } },
      }),
    ).toBe('toStartOfInterval(toDateTime(t), INTERVAL 60 second) > toDateTime(1767225600)');
  });

  it('leaves the comments of a query alone', () => {
    const sql = 'SELECT 1 -- $__timeFilter is not used /* yet */\n/* nor $__timeInterval */ # or $__dateFilter';

    expect(expandMacros(sql, context)).toBe(sql);
    // A comment mark inside a string is not one.
    expect(expandMacros("SELECT '--', $__interval_s", context)).toBe("SELECT '--', 60");
  });

  it('rejects a macro without its arguments', () => {
    expect(() => expandMacros('WHERE $__timeFilter', context)).toThrow('The $__timeFilter macro expects 1 argument');
    expect(() => expandMacros('$__dateTimeFilter(d)', context)).toThrow('expects 2 arguments');
  });

  it('rejects a time macro when the query has no time range', () => {
    expect(() => expandMacros('$__timeFilter(t)', { ...context, timeRange: undefined })).toThrow(/needs a time range/);
    // The interval macros do not need it.
    expect(expandMacros('$__interval_s', { ...context, timeRange: undefined })).toBe('60');
  });
});

describe('parseQueryVariables', () => {
  it('lists the dashboard variables, not the macros', () => {
    expect(
      parseQueryVariables('WHERE $__timeFilter(t) AND a = $foo AND b IN (${bar:sqlstring}) AND $__interval_s > 1'),
    ).toEqual(['foo', 'bar']);
  });
});
