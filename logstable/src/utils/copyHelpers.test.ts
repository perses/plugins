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

import { LogEntry } from '@perses-dev/core';
import {
  formatTimestamp,
  formatLabels,
  formatLogEntry,
  formatLogMessage,
  formatLogAsJson,
  formatLogEntries,
} from './copyHelpers';

describe('copyHelpers', () => {
  const mockLog: LogEntry = {
    timestamp: 1767225600, // 2026-01-01T00:00:00.000Z
    line: 'foo bar baz',
    labels: { level: 'info', service: 'foo' },
  };

  describe('formatTimestamp', () => {
    it('should format numeric timestamp as ISO string', () => {
      expect(formatTimestamp(1767225600)).toBe('2026-01-01T00:00:00.000Z');
    });

    it('should format string timestamp as ISO string', () => {
      expect(formatTimestamp('1767225600')).toBe('2026-01-01T00:00:00.000Z');
    });

    it('should format ISO string timestamp as ISO string', () => {
      expect(formatTimestamp('2026-01-01T00:00:00.000Z')).toBe('2026-01-01T00:00:00.000Z');
    });
  });

  describe('formatLabels', () => {
    it('should format multiple labels correctly', () => {
      expect(formatLabels({ level: 'info', service: 'foo' })).toBe('level="info" service="foo"');
    });

    it('should format empty labels correctly', () => {
      expect(formatLabels({})).toBe('');
    });

    it('should format single label correctly', () => {
      expect(formatLabels({ level: 'debug' })).toBe('level="debug"');
    });
  });

  describe('formatLogEntry', () => {
    it('should format log with timestamp, labels, and message', () => {
      const result = formatLogEntry(mockLog);
      expect(result).toContain('2026-01-01T00:00:00.000Z');
      expect(result).toContain('level="info"');
      expect(result).toContain('service="foo"');
      expect(result).toContain('foo bar baz');
    });

    it('should handle logs without labels', () => {
      const logWithoutLabels = { ...mockLog, labels: {} };
      const result = formatLogEntry(logWithoutLabels);
      expect(result).toBe('2026-01-01T00:00:00.000Z foo bar baz');
      expect(result).not.toContain('=');
    });

    it('should handle undefined labels', () => {
      const logWithoutLabels = { ...mockLog, labels: undefined as any };
      const result = formatLogEntry(logWithoutLabels);
      expect(result).toBe('2026-01-01T00:00:00.000Z foo bar baz');
    });
  });

  describe('formatLogMessage', () => {
    it('should return only the message text', () => {
      expect(formatLogMessage(mockLog)).toBe('foo bar baz');
    });
  });

  describe('formatLogAsJson', () => {
    it('should format log as valid JSON', () => {
      const result = formatLogAsJson(mockLog);
      expect(JSON.parse(result)).toEqual(mockLog);
    });

    it('should use 2-space indentation', () => {
      const result = formatLogAsJson(mockLog);
      expect(result).toContain('  "timestamp"');
      expect(result).toContain('  "line"');
    });
  });

  describe('formatLogEntries', () => {
    it('should format multiple logs with newlines', () => {
      const logs: LogEntry[] = [
        { timestamp: 1, line: 'log 1', labels: {} },
        { timestamp: 2, line: 'log 2', labels: {} },
        { timestamp: 3, line: 'log 3', labels: {} },
      ];
      const result = formatLogEntries(logs);
      const lines = result.split('\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toContain('log 1');
      expect(lines[1]).toContain('log 2');
      expect(lines[2]).toContain('log 3');
    });

    it('should return empty string for empty array', () => {
      expect(formatLogEntries([])).toBe('');
    });

    it('should handle single log without newline', () => {
      const result = formatLogEntries([mockLog]);
      expect(result).toContain('foo bar baz');
      expect(result).not.toContain('\n');
    });
  });
});
