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

import { AbsoluteTimeRange } from '@perses-dev/core';
import { replaceInfluxDBBuiltinVariables } from './replace-influxdb-builtin-variables';

describe('replaceInfluxDBBuiltinVariables', () => {
  const timeRange: AbsoluteTimeRange = {
    start: new Date('2024-01-23T10:00:00.000Z'),
    end: new Date('2024-01-23T11:00:00.000Z'),
  };
  const intervalMs = 60_000;

  describe('$__timeFrom', () => {
    it('replaces $__timeFrom with ISO timestamp by default', () => {
      const result = replaceInfluxDBBuiltinVariables(
        'SELECT * FROM m WHERE time >= $__timeFrom',
        timeRange,
        intervalMs
      );
      expect(result).toBe("SELECT * FROM m WHERE time >= '2024-01-23T10:00:00.000Z'");
    });

    it('replaces ${__timeFrom} with ISO timestamp', () => {
      const result = replaceInfluxDBBuiltinVariables(
        'SELECT * FROM m WHERE time >= ${__timeFrom}',
        timeRange,
        intervalMs
      );
      expect(result).toBe("SELECT * FROM m WHERE time >= '2024-01-23T10:00:00.000Z'");
    });

    it('replaces $__timeFrom with unix epoch when format is unix', () => {
      const result = replaceInfluxDBBuiltinVariables(
        'SELECT * FROM m WHERE time >= $__timeFrom',
        timeRange,
        intervalMs,
        'unix'
      );
      expect(result).toBe('SELECT * FROM m WHERE time >= 1706004000');
    });
  });

  describe('$__timeTo', () => {
    it('replaces $__timeTo with ISO timestamp by default', () => {
      const result = replaceInfluxDBBuiltinVariables('SELECT * FROM m WHERE time <= $__timeTo', timeRange, intervalMs);
      expect(result).toBe("SELECT * FROM m WHERE time <= '2024-01-23T11:00:00.000Z'");
    });

    it('replaces $__timeTo with unix epoch when format is unix', () => {
      const result = replaceInfluxDBBuiltinVariables(
        'SELECT * FROM m WHERE time <= $__timeTo',
        timeRange,
        intervalMs,
        'unix'
      );
      expect(result).toBe('SELECT * FROM m WHERE time <= 1706007600');
    });
  });

  describe('$__timeFilter', () => {
    it('replaces $__timeFilter(field) with ISO BETWEEN clause', () => {
      const result = replaceInfluxDBBuiltinVariables(
        'SELECT * FROM m WHERE $__timeFilter(time)',
        timeRange,
        intervalMs
      );
      expect(result).toBe(
        "SELECT * FROM m WHERE time >= '2024-01-23T10:00:00.000Z' AND time <= '2024-01-23T11:00:00.000Z'"
      );
    });

    it('replaces $__timeFilter(field) with numeric clause when format is unix', () => {
      const result = replaceInfluxDBBuiltinVariables(
        'SELECT * FROM m WHERE $__timeFilter(time)',
        timeRange,
        intervalMs,
        'unix'
      );
      expect(result).toBe('SELECT * FROM m WHERE time >= 1706004000 AND time <= 1706007600');
    });
  });

  describe('$__interval', () => {
    it('replaces $__interval with seconds', () => {
      const result = replaceInfluxDBBuiltinVariables(
        'SELECT mean(value) FROM m GROUP BY time($__interval)',
        timeRange,
        intervalMs
      );
      expect(result).toBe('SELECT mean(value) FROM m GROUP BY time(60)');
    });

    it('replaces $__interval_ms with milliseconds', () => {
      const result = replaceInfluxDBBuiltinVariables(
        'SELECT mean(value) FROM m GROUP BY time($__interval_ms)',
        timeRange,
        intervalMs
      );
      expect(result).toBe('SELECT mean(value) FROM m GROUP BY time(60000)');
    });
  });

  it('replaces multiple macros in one query', () => {
    const result = replaceInfluxDBBuiltinVariables(
      'SELECT mean(value) FROM m WHERE $__timeFilter(time) GROUP BY time($__interval)',
      timeRange,
      intervalMs
    );
    expect(result).toBe(
      "SELECT mean(value) FROM m WHERE time >= '2024-01-23T10:00:00.000Z' AND time <= '2024-01-23T11:00:00.000Z' GROUP BY time(60)"
    );
  });
});
