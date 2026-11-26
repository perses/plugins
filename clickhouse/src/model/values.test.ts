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

import { addLabels, toNumber, toUnixMs, toUnixNano } from './values';

describe('toUnixMs', () => {
  it('reads ISO date/times and dates', () => {
    expect(toUnixMs('2026-01-01T10:00:00.123456789Z')).toBe(Date.UTC(2026, 0, 1, 10, 0, 0, 123));
    expect(toUnixMs('2026-01-01')).toBe(Date.UTC(2026, 0, 1));
  });

  it('reads a date/time without a zone in the time zone of the column or server', () => {
    // Winter: UTC+1. Summer: UTC+2.
    expect(toUnixMs('2026-01-01 10:00:00', 'Europe/Paris')).toBe(Date.UTC(2026, 0, 1, 9));
    expect(toUnixMs('2026-07-01 10:00:00.250', 'Europe/Paris')).toBe(Date.UTC(2026, 6, 1, 8, 0, 0, 250));
    // Right after the switch to summer time, at 01:00 UTC.
    expect(toUnixMs('2026-03-29 03:30:00', 'Europe/Paris')).toBe(Date.UTC(2026, 2, 29, 1, 30));
    expect(toUnixMs('2026-01-01 10:00:00')).toBe(Date.UTC(2026, 0, 1, 10));
  });

  it('tells the unit of an epoch number from its magnitude', () => {
    const expected = Date.UTC(2026, 0, 1);
    expect(toUnixMs(expected / 1000)).toBe(expected);
    expect(toUnixMs(expected)).toBe(expected);
    expect(toUnixMs(String(expected * 1000))).toBe(expected);
    expect(toUnixMs(`${expected}000000`)).toBe(expected);
  });

  it('is NaN for what is not a timestamp', () => {
    expect(toUnixMs('yesterday')).toBeNaN();
    expect(toUnixMs(null)).toBeNaN();
    expect(toUnixMs('')).toBeNaN();
  });
});

describe('toUnixNano', () => {
  it('keeps the nanoseconds, which a number can not hold', () => {
    expect(toUnixNano('2026-01-01T10:00:00.123456789Z')).toBe(1767261600123456789n);
    expect(toUnixNano('1767261600123456789')).toBe(1767261600123456789n);
  });
});

describe('toNumber', () => {
  it('reads quoted 64-bit integers and booleans, and nothing else', () => {
    expect(toNumber('42')).toBe(42);
    expect(toNumber(true)).toBe(1);
    expect(toNumber('')).toBeNull();
    expect(toNumber('abc')).toBeNull();
    expect(toNumber(null)).toBeNull();
    expect(toNumber(NaN)).toBeNull();
  });
});

describe('addLabels', () => {
  it('adds one label per key of a map and leaves null values out', () => {
    const labels: Record<string, string> = {};

    addLabels(labels, 'ServiceName', 'api');
    addLabels(labels, 'Attributes', { 'http.method': 'GET', nested: { code: 200 } });
    addLabels(labels, 'Missing', null);
    addLabels(labels, 'List', ['a', 'b']);

    expect(labels).toEqual({
      ServiceName: 'api',
      'Attributes.http.method': 'GET',
      'Attributes.nested.code': '200',
      List: '["a","b"]',
    });
  });
});
