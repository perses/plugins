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

import { LogEntry } from '@perses-dev/spec';
import { compareLogsByColumn, SortState } from './logs-table-sorting';

describe('compareLogsByColumn', () => {
  const logA: LogEntry = {
    timestamp: 1000,
    line: 'alpha message',
    labels: { level: 'info', count: '10', service: 'web' },
  };

  const logB: LogEntry = {
    timestamp: 2000,
    line: 'beta message',
    labels: { level: 'error', count: '2', service: 'api' },
  };

  describe('timestamp mode', () => {
    it('should sort by timestamp ascending', () => {
      const sort: SortState = { columnName: 'timestamp', direction: 'asc', mode: 'timestamp' };
      expect(compareLogsByColumn(logA, logB, sort)).toBeLessThan(0);
    });

    it('should sort by timestamp descending', () => {
      const sort: SortState = { columnName: 'timestamp', direction: 'desc', mode: 'timestamp' };
      expect(compareLogsByColumn(logA, logB, sort)).toBeGreaterThan(0);
    });

    it('should return 0 for equal timestamps', () => {
      const sort: SortState = { columnName: 'timestamp', direction: 'asc', mode: 'timestamp' };
      expect(compareLogsByColumn(logA, { ...logA }, sort)).toBe(0);
    });
  });

  describe('alphabetical mode', () => {
    it('should sort line column alphabetically ascending', () => {
      const sort: SortState = { columnName: 'line', direction: 'asc', mode: 'alphabetical' };
      expect(compareLogsByColumn(logA, logB, sort)).toBeLessThan(0);
    });

    it('should sort line column alphabetically descending', () => {
      const sort: SortState = { columnName: 'line', direction: 'desc', mode: 'alphabetical' };
      expect(compareLogsByColumn(logA, logB, sort)).toBeGreaterThan(0);
    });

    it('should sort label columns alphabetically', () => {
      const sort: SortState = { columnName: 'level', direction: 'asc', mode: 'alphabetical' };
      // 'error' < 'info' alphabetically
      expect(compareLogsByColumn(logA, logB, sort)).toBeGreaterThan(0);
    });

    it('should sort undefined labels last in ascending order', () => {
      const logNoLabel: LogEntry = { timestamp: 500, line: 'test', labels: {} };
      const sort: SortState = { columnName: 'level', direction: 'asc', mode: 'alphabetical' };
      // logNoLabel has no 'level' label, should sort last
      expect(compareLogsByColumn(logA, logNoLabel, sort)).toBeLessThan(0);
    });

    it('should sort undefined labels last in descending order', () => {
      const logNoLabel: LogEntry = { timestamp: 500, line: 'test', labels: {} };
      const sort: SortState = { columnName: 'level', direction: 'desc', mode: 'alphabetical' };
      // logNoLabel has no 'level' label, should still sort last
      expect(compareLogsByColumn(logA, logNoLabel, sort)).toBeLessThan(0);
    });

    it('should return 0 when both labels are undefined', () => {
      const logNoLabel1: LogEntry = { timestamp: 500, line: 'test1', labels: {} };
      const logNoLabel2: LogEntry = { timestamp: 600, line: 'test2', labels: {} };
      const sort: SortState = { columnName: 'level', direction: 'asc', mode: 'alphabetical' };
      expect(compareLogsByColumn(logNoLabel1, logNoLabel2, sort)).toBe(0);
    });
  });

  describe('numeric mode', () => {
    it('should sort numeric label values ascending', () => {
      const sort: SortState = { columnName: 'count', direction: 'asc', mode: 'numeric' };
      // '10' vs '2' — numeric: 10 > 2
      expect(compareLogsByColumn(logA, logB, sort)).toBeGreaterThan(0);
    });

    it('should sort numeric label values descending', () => {
      const sort: SortState = { columnName: 'count', direction: 'desc', mode: 'numeric' };
      expect(compareLogsByColumn(logA, logB, sort)).toBeLessThan(0);
    });

    it('should sort NaN values last in ascending order', () => {
      const logNaN: LogEntry = { timestamp: 500, line: 'test', labels: { count: 'notanumber' } };
      const sort: SortState = { columnName: 'count', direction: 'asc', mode: 'numeric' };
      expect(compareLogsByColumn(logA, logNaN, sort)).toBeLessThan(0);
    });

    it('should sort NaN values last in descending order', () => {
      const logNaN: LogEntry = { timestamp: 500, line: 'test', labels: { count: 'notanumber' } };
      const sort: SortState = { columnName: 'count', direction: 'desc', mode: 'numeric' };
      expect(compareLogsByColumn(logA, logNaN, sort)).toBeLessThan(0);
    });

    it('should return 0 when both values are NaN', () => {
      const logNaN1: LogEntry = { timestamp: 500, line: 'test1', labels: { count: 'abc' } };
      const logNaN2: LogEntry = { timestamp: 600, line: 'test2', labels: { count: 'xyz' } };
      const sort: SortState = { columnName: 'count', direction: 'asc', mode: 'numeric' };
      expect(compareLogsByColumn(logNaN1, logNaN2, sort)).toBe(0);
    });
  });
});
