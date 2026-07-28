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

jest.mock('echarts/core');
jest.mock('@perses-dev/components', () => ({ InfoTooltip: 'InfoTooltip' }));
jest.mock('@perses-dev/plugin-system', () => {
  const csvExport = jest.requireActual('@perses-dev/plugin-system/dist/cjs/utils/csv-export');
  return {
    escapeCsvValue: csvExport.escapeCsvValue,
    formatTimestampISO: csvExport.formatTimestampISO,
    sanitizeFilename: csvExport.sanitizeFilename,
  };
});

import { LogEntry } from '@perses-dev/spec';
import { collectLabelKeys, buildLogsCsvString } from './LogsTableCsvExportAction';

describe('collectLabelKeys', () => {
  it('returns sorted unique label keys from multiple entries', () => {
    const entries: LogEntry[] = [
      { timestamp: 1767225600, line: 'log1', labels: { service: 'api', level: 'info' } },
      { timestamp: 1767225601, line: 'log2', labels: { region: 'us-east', level: 'warn' } },
    ];
    expect(collectLabelKeys(entries)).toEqual(['level', 'region', 'service']);
  });

  it('returns empty array when entries have no labels', () => {
    const entries: LogEntry[] = [
      { timestamp: 1767225600, line: 'log1', labels: {} },
      { timestamp: 1767225601, line: 'log2', labels: {} },
    ];
    expect(collectLabelKeys(entries)).toEqual([]);
  });

  it('handles entries with different label sets (union of all keys)', () => {
    const entries: LogEntry[] = [
      { timestamp: 1767225600, line: 'log1', labels: { app: 'web' } },
      { timestamp: 1767225601, line: 'log2', labels: { env: 'prod' } },
      { timestamp: 1767225602, line: 'log3', labels: { host: 'server-1' } },
    ];
    expect(collectLabelKeys(entries)).toEqual(['app', 'env', 'host']);
  });

  it('deduplicates keys that appear in multiple entries', () => {
    const entries: LogEntry[] = [
      { timestamp: 1767225600, line: 'log1', labels: { level: 'info', service: 'api' } },
      { timestamp: 1767225601, line: 'log2', labels: { level: 'warn', service: 'web' } },
      { timestamp: 1767225602, line: 'log3', labels: { level: 'error', service: 'db' } },
    ];
    expect(collectLabelKeys(entries)).toEqual(['level', 'service']);
  });
});

describe('buildLogsCsvString', () => {
  it('produces correct header row with sorted label columns', () => {
    const entries: LogEntry[] = [{ timestamp: 1767225600, line: 'test', labels: { service: 'api', level: 'info' } }];
    const csv = buildLogsCsvString(entries);
    const headerRow = csv.split('\n')[0];
    expect(headerRow).toBe('timestamp,body,level,service');
  });

  it('formats timestamps as ISO 8601', () => {
    const entries: LogEntry[] = [{ timestamp: 1767225600, line: 'test', labels: {} }];
    const csv = buildLogsCsvString(entries);
    const dataRow = csv.split('\n')[1];
    expect(dataRow).toContain('2026-01-01T00:00:00.000Z');
  });

  it('strips ANSI codes from log lines', () => {
    const entries: LogEntry[] = [
      { timestamp: 1767225600, line: '\x1b[31mERROR\x1b[0m connection refused', labels: {} },
    ];
    const csv = buildLogsCsvString(entries);
    const dataRow = csv.split('\n')[1];
    expect(dataRow).not.toContain('\x1b[');
    expect(dataRow).toContain('ERROR connection refused');
  });

  it('escapes values containing commas, quotes, and newlines', () => {
    const entries: LogEntry[] = [{ timestamp: 1767225600, line: 'message with "quotes" and, commas', labels: {} }];
    const csv = buildLogsCsvString(entries);
    const dataRow = csv.split('\n')[1];
    expect(dataRow).toContain('"message with ""quotes"" and, commas"');
  });

  it('handles entries with missing labels (empty string in column)', () => {
    const entries: LogEntry[] = [
      { timestamp: 1767225600, line: 'log1', labels: { level: 'info', service: 'api' } },
      { timestamp: 1767225601, line: 'log2', labels: { level: 'warn' } },
    ];
    const csv = buildLogsCsvString(entries);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('timestamp,body,level,service');
    expect(lines[1]).toContain('api');
    const secondRowCols = lines[2]!.split(',');
    expect(secondRowCols[secondRowCols.length - 1]).toBe('');
  });

  it('returns header-only string when entries array is empty', () => {
    const csv = buildLogsCsvString([]);
    expect(csv).toBe('timestamp,body\n');
  });

  it('handles entries with no labels (only timestamp and body columns)', () => {
    const entries: LogEntry[] = [
      { timestamp: 1767225600, line: 'simple log', labels: {} },
      { timestamp: 1767225601, line: 'another log', labels: {} },
    ];
    const csv = buildLogsCsvString(entries);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('timestamp,body');
    expect(lines[1]).toBe('2026-01-01T00:00:00.000Z,simple log');
  });
});
