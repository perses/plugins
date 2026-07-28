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

import { Silence } from '@perses-dev/spec';
import { getSilenceDuration, getSilenceFieldValue, inferSortMode } from './silence-table-model';

const makeSilence = (overrides: Partial<Silence> = {}): Silence => ({
  id: 'silence-1',
  state: 'active',
  matchers: [{ name: 'alertname', value: 'Test', isRegex: false, isEqual: true }],
  startsAt: '2024-01-01T00:00:00Z',
  endsAt: '2024-01-01T02:00:00Z',
  createdBy: 'admin',
  comment: 'Test silence',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('getSilenceDuration', () => {
  it('calculates duration between start and end', () => {
    const silence = makeSilence({
      startsAt: '2024-01-01T00:00:00Z',
      endsAt: '2024-01-01T02:00:00Z',
    });
    const duration = getSilenceDuration(silence);
    expect(duration).toBe('2h');
  });

  it('handles multi-day durations', () => {
    const silence = makeSilence({
      startsAt: '2024-01-01T00:00:00Z',
      endsAt: '2024-01-03T12:00:00Z',
    });
    const duration = getSilenceDuration(silence);
    expect(duration).toBe('2d 12h');
  });

  it('handles minute-only durations', () => {
    const silence = makeSilence({
      startsAt: '2024-01-01T00:00:00Z',
      endsAt: '2024-01-01T00:30:00Z',
    });
    const duration = getSilenceDuration(silence);
    expect(duration).toBe('30m');
  });

  it('returns 0m for zero-length duration', () => {
    const silence = makeSilence({
      startsAt: '2024-01-01T00:00:00Z',
      endsAt: '2024-01-01T00:00:00Z',
    });
    const duration = getSilenceDuration(silence);
    expect(duration).toBe('0m');
  });
});

describe('getSilenceFieldValue', () => {
  it('returns status state', () => {
    const silence = makeSilence({ state: 'active' });
    expect(getSilenceFieldValue(silence, 'status')).toBe('active');
  });

  it('returns createdBy', () => {
    const silence = makeSilence({ createdBy: 'bob' });
    expect(getSilenceFieldValue(silence, 'createdBy')).toBe('bob');
  });

  it('returns startsAt', () => {
    const silence = makeSilence({ startsAt: '2024-06-01T12:00:00Z' });
    expect(getSilenceFieldValue(silence, 'startsAt')).toBe('2024-06-01T12:00:00Z');
  });

  it('returns endsAt', () => {
    const silence = makeSilence({ endsAt: '2024-06-02T12:00:00Z' });
    expect(getSilenceFieldValue(silence, 'endsAt')).toBe('2024-06-02T12:00:00Z');
  });

  it('returns duration string', () => {
    const silence = makeSilence({
      startsAt: '2024-01-01T00:00:00Z',
      endsAt: '2024-01-01T02:00:00Z',
    });
    expect(getSilenceFieldValue(silence, 'duration')).toBe('2h');
  });

  it('returns comment', () => {
    const silence = makeSilence({ comment: 'maintenance' });
    expect(getSilenceFieldValue(silence, 'comment')).toBe('maintenance');
  });

  it('returns matchers as joined string', () => {
    const silence = makeSilence({
      matchers: [
        { name: 'alertname', value: 'Test', isRegex: false, isEqual: true },
        { name: 'severity', value: 'critical', isRegex: false, isEqual: true },
      ],
    });
    expect(getSilenceFieldValue(silence, 'matchers')).toBe('alertname=Test, severity=critical');
  });

  it('returns empty string for empty updatedAt', () => {
    const silence = makeSilence({ updatedAt: '' });
    expect(getSilenceFieldValue(silence, 'updatedAt')).toBe('');
  });
});

describe('inferSortMode', () => {
  it('returns status for status field', () => {
    expect(inferSortMode('status')).toBe('status');
  });

  it('returns date for date fields', () => {
    expect(inferSortMode('startsAt')).toBe('date');
    expect(inferSortMode('endsAt')).toBe('date');
    expect(inferSortMode('updatedAt')).toBe('date');
  });

  it('returns alphabetical for other fields', () => {
    expect(inferSortMode('createdBy')).toBe('alphabetical');
    expect(inferSortMode('comment')).toBe('alphabetical');
    expect(inferSortMode('duration')).toBe('alphabetical');
    expect(inferSortMode('matchers')).toBe('alphabetical');
  });
});
