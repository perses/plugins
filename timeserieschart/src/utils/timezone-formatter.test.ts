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

import { createTimezoneAwareAxisFormatter } from './timezone-formatter';

// Mock formatWithTimeZone since it's from @perses-dev/components
jest.mock('@perses-dev/components', () => ({
  formatWithTimeZone: jest.fn((date: Date, format: string, timeZone: string) => {
    // Simple mock that returns format pattern with timezone
    return `${format}[${timeZone}]`;
  }),
}));

describe('createTimezoneAwareAxisFormatter', () => {
  const testTimestamp = 1640995200000; // 2022-01-01 00:00:00 UTC
  const timeZone = 'America/New_York';

  it('should format for ranges > 5 years with year format', () => {
    const formatter = createTimezoneAwareAxisFormatter(6 * 365 * 24 * 60 * 60 * 1000, timeZone);
    const result = formatter(testTimestamp);
    expect(result).toBe('yyyy[America/New_York]');
  });

  it('should format for ranges > 2 years with month-year format', () => {
    const formatter = createTimezoneAwareAxisFormatter(3 * 365 * 24 * 60 * 60 * 1000, timeZone);
    const result = formatter(testTimestamp);
    expect(result).toBe('MMM yyyy[America/New_York]');
  });

  it('should format for ranges between 10 days and 6 months with day-month format', () => {
    const formatter = createTimezoneAwareAxisFormatter(30 * 24 * 60 * 60 * 1000, timeZone); // 30 days
    const result = formatter(testTimestamp);
    expect(result).toBe('dd.MM[America/New_York]');
  });

  it('should format for ranges between 2-10 days with day-month-time format', () => {
    const formatter = createTimezoneAwareAxisFormatter(5 * 24 * 60 * 60 * 1000, timeZone); // 5 days
    const result = formatter(testTimestamp);
    expect(result).toBe('dd.MM HH:mm[America/New_York]');
  });

  it('should format for ranges <= 2 days with time format', () => {
    const formatter = createTimezoneAwareAxisFormatter(6 * 60 * 60 * 1000, timeZone); // 6 hours
    const result = formatter(testTimestamp);
    expect(result).toBe('HH:mm[America/New_York]');
  });

  it('should handle different timezones', () => {
    const formatter = createTimezoneAwareAxisFormatter(6 * 60 * 60 * 1000, 'Europe/Prague');
    const result = formatter(testTimestamp);
    expect(result).toBe('HH:mm[Europe/Prague]');
  });

  it('should handle edge case at exactly 5 years', () => {
    const fiveYears = 5 * 365 * 24 * 60 * 60 * 1000;
    const formatter = createTimezoneAwareAxisFormatter(fiveYears, timeZone);
    const result = formatter(testTimestamp);
    // Should use MMM yyyy format (not > 5 years)
    expect(result).toBe('MMM yyyy[America/New_York]');
  });

  it('should handle edge case at exactly 2 days', () => {
    const twoDays = 2 * 24 * 60 * 60 * 1000;
    const formatter = createTimezoneAwareAxisFormatter(twoDays, timeZone);
    const result = formatter(testTimestamp);
    // Should use HH:mm format (not > 2 days)
    expect(result).toBe('HH:mm[America/New_York]');
  });
});
