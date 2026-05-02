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
import { compareSilencesByColumn, SilenceSortState } from './silence-table-sorting';

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

describe('compareSilencesByColumn', () => {
  describe('status sort', () => {
    const sort: SilenceSortState = { fieldName: 'status', direction: 'asc', mode: 'status' };

    it('sorts active before pending before expired (asc)', () => {
      const silences = [
        makeSilence({ id: '1', state: 'expired' }),
        makeSilence({ id: '2', state: 'active' }),
        makeSilence({ id: '3', state: 'pending' }),
      ];
      silences.sort((a, b) => compareSilencesByColumn(a, b, sort));
      expect(silences.map((s) => s.state)).toEqual(['active', 'pending', 'expired']);
    });

    it('reverses order for desc', () => {
      const descSort: SilenceSortState = { ...sort, direction: 'desc' };
      const silences = [
        makeSilence({ id: '1', state: 'active' }),
        makeSilence({ id: '2', state: 'expired' }),
        makeSilence({ id: '3', state: 'pending' }),
      ];
      silences.sort((a, b) => compareSilencesByColumn(a, b, descSort));
      expect(silences.map((s) => s.state)).toEqual(['expired', 'pending', 'active']);
    });
  });

  describe('alphabetical sort', () => {
    const sort: SilenceSortState = { fieldName: 'createdBy', direction: 'asc', mode: 'alphabetical' };

    it('sorts alphabetically ascending', () => {
      const silences = [
        makeSilence({ id: '1', createdBy: 'charlie' }),
        makeSilence({ id: '2', createdBy: 'alice' }),
        makeSilence({ id: '3', createdBy: 'bob' }),
      ];
      silences.sort((a, b) => compareSilencesByColumn(a, b, sort));
      expect(silences.map((s) => s.createdBy)).toEqual(['alice', 'bob', 'charlie']);
    });

    it('sorts alphabetically descending', () => {
      const descSort: SilenceSortState = { ...sort, direction: 'desc' };
      const silences = [
        makeSilence({ id: '1', createdBy: 'alice' }),
        makeSilence({ id: '2', createdBy: 'charlie' }),
        makeSilence({ id: '3', createdBy: 'bob' }),
      ];
      silences.sort((a, b) => compareSilencesByColumn(a, b, descSort));
      expect(silences.map((s) => s.createdBy)).toEqual(['charlie', 'bob', 'alice']);
    });
  });

  describe('date sort', () => {
    const sort: SilenceSortState = { fieldName: 'startsAt', direction: 'asc', mode: 'date' };

    it('sorts by date ascending', () => {
      const silences = [
        makeSilence({ id: '1', startsAt: '2024-03-01T00:00:00Z' }),
        makeSilence({ id: '2', startsAt: '2024-01-01T00:00:00Z' }),
        makeSilence({ id: '3', startsAt: '2024-02-01T00:00:00Z' }),
      ];
      silences.sort((a, b) => compareSilencesByColumn(a, b, sort));
      expect(silences.map((s) => s.startsAt)).toEqual([
        '2024-01-01T00:00:00Z',
        '2024-02-01T00:00:00Z',
        '2024-03-01T00:00:00Z',
      ]);
    });

    it('sorts by date descending', () => {
      const descSort: SilenceSortState = { ...sort, direction: 'desc' };
      const silences = [
        makeSilence({ id: '1', startsAt: '2024-01-01T00:00:00Z' }),
        makeSilence({ id: '2', startsAt: '2024-03-01T00:00:00Z' }),
        makeSilence({ id: '3', startsAt: '2024-02-01T00:00:00Z' }),
      ];
      silences.sort((a, b) => compareSilencesByColumn(a, b, descSort));
      expect(silences.map((s) => s.startsAt)).toEqual([
        '2024-03-01T00:00:00Z',
        '2024-02-01T00:00:00Z',
        '2024-01-01T00:00:00Z',
      ]);
    });

    it('pushes empty dates to the end', () => {
      const silences = [
        makeSilence({ id: '1', updatedAt: '' }),
        makeSilence({ id: '2', updatedAt: '2024-01-01T00:00:00Z' }),
      ];
      const updatedAtSort: SilenceSortState = { fieldName: 'updatedAt', direction: 'asc', mode: 'date' };
      silences.sort((a, b) => compareSilencesByColumn(a, b, updatedAtSort));
      expect(silences.map((s) => s.updatedAt)).toEqual(['2024-01-01T00:00:00Z', '']);
    });
  });
});
