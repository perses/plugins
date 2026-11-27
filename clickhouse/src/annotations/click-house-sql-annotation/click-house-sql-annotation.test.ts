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

import { stubResponse } from '../../test/stubs';
import { buildAnnotations } from './get-annotation-data';

describe('buildAnnotations', () => {
  it('reads a row as an annotation: its time, its texts, and its other columns as tags', () => {
    expect(
      buildAnnotations(
        stubResponse(
          [
            ['time', "DateTime('UTC')"],
            ['title', 'String'],
            ['legend', 'String'],
            ['service', 'String'],
            ['attributes', 'Map(String, String)'],
            ['empty', 'String'],
          ],
          [
            ['2026-01-01T10:00:00Z', 'Deployment', 'v1.2', 'api', { author: 'me' }, ''],
            // Not a time: left out.
            ['soon', 'Skipped', '', 'api', {}, ''],
          ],
        ),
      ),
    ).toEqual([
      {
        start: Date.UTC(2026, 0, 1, 10),
        title: 'Deployment',
        legend: 'v1.2',
        tags: { service: 'api', 'attributes.author': 'me' },
      },
    ]);
  });

  it('reads the "start" and "end" columns as a time span', () => {
    expect(
      buildAnnotations(
        stubResponse(
          [
            ['end', "DateTime('UTC')"],
            ['start', "DateTime('UTC')"],
          ],
          [
            ['2026-01-01T10:30:00Z', '2026-01-01T10:00:00Z'],
            // An end that is not after the start is no time span.
            ['2026-01-01T09:00:00Z', '2026-01-01T10:00:00Z'],
          ],
        ),
      ),
    ).toEqual([
      { start: Date.UTC(2026, 0, 1, 10), end: Date.UTC(2026, 0, 1, 10, 30) },
      { start: Date.UTC(2026, 0, 1, 10) },
    ]);
  });

  it('falls back to the first date/time column, and fails without any', () => {
    expect(
      buildAnnotations(
        stubResponse(
          [
            ['name', 'String'],
            ['deployed_at', 'DateTime'],
          ],
          [['api', '2026-01-01 11:00:00']],
          { timeZone: 'Europe/Paris' },
        ),
      ),
    ).toEqual([{ start: Date.UTC(2026, 0, 1, 10), tags: { name: 'api' } }]);
    expect(() => buildAnnotations(stubResponse([['name', 'String']], [['api']]))).toThrow(
      /must return a "time" column/,
    );
  });
});
