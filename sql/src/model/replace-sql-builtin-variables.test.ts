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
import { AbsoluteTimeRange } from '@perses-dev/spec';
import { replaceSQLBuiltinVariables } from './replace-sql-builtin-variables';
describe('replaceSQLBuiltinVariables', () => {
  const timeRange: AbsoluteTimeRange = {
    start: new Date('2024-01-23T10:00:00.000Z'),
    end: new Date('2024-01-23T11:00:00.000Z'),
  };
  const intervalMs = 60000; // 60 seconds
  describe('ISO8601 format (default)', () => {
    it('should replace $__timeFrom with ISO timestamp', () => {
      const query = 'SELECT * FROM metrics WHERE timestamp >= $__timeFrom';
      const result = replaceSQLBuiltinVariables(query, timeRange, intervalMs);
      expect(result).toBe("SELECT * FROM metrics WHERE timestamp >= '2024-01-23T10:00:00.000Z'");
    });
    it('should replace ${__timeFrom} with ISO timestamp', () => {
      const query = 'SELECT * FROM metrics WHERE timestamp >= ${__timeFrom}';
      const result = replaceSQLBuiltinVariables(query, timeRange, intervalMs);
      expect(result).toBe("SELECT * FROM metrics WHERE timestamp >= '2024-01-23T10:00:00.000Z'");
    });
    it('should replace $__timeFilter(column) with quoted BETWEEN clause', () => {
      const query = 'SELECT * FROM metrics WHERE $__timeFilter(timestamp)';
      const result = replaceSQLBuiltinVariables(query, timeRange, intervalMs);
      expect(result).toBe(
        "SELECT * FROM metrics WHERE timestamp BETWEEN '2024-01-23T10:00:00.000Z' AND '2024-01-23T11:00:00.000Z'"
      );
    });
  });
  describe('Unix format', () => {
    it('should replace $__timeFrom with unix timestamp', () => {
      const query = 'SELECT * FROM metrics WHERE timestamp >= $__timeFrom';
      const result = replaceSQLBuiltinVariables(query, timeRange, intervalMs, 'unix');
      expect(result).toBe('SELECT * FROM metrics WHERE timestamp >= 1705903200');
    });
    it('should replace $__timeTo with unix timestamp', () => {
      const query = 'SELECT * FROM metrics WHERE timestamp <= $__timeTo';
      const result = replaceSQLBuiltinVariables(query, timeRange, intervalMs, 'unix');
      expect(result).toBe('SELECT * FROM metrics WHERE timestamp <= 1705906800');
    });
    it('should replace $__timeFilter(column) with numeric BETWEEN clause', () => {
      const query = 'SELECT * FROM metrics WHERE $__timeFilter(timestamp)';
      const result = replaceSQLBuiltinVariables(query, timeRange, intervalMs, 'unix');
      expect(result).toBe('SELECT * FROM metrics WHERE timestamp BETWEEN 1705903200 AND 1705906800');
    });
  });
  describe('interval variables', () => {
    it('should replace $__interval with seconds', () => {
      const query = 'SELECT time_bucket($__interval, time) FROM metrics';
      const result = replaceSQLBuiltinVariables(query, timeRange, intervalMs);
      expect(result).toBe('SELECT time_bucket(60, time) FROM metrics');
    });
    it('should replace $__interval_ms with milliseconds', () => {
      const query = 'SELECT time_bucket($__interval_ms, time) FROM metrics';
      const result = replaceSQLBuiltinVariables(query, timeRange, intervalMs);
      expect(result).toBe('SELECT time_bucket(60000, time) FROM metrics');
    });
  });
});
