// Copyright The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { parseIso8601DurationMs } from './iso8601-duration';

describe('parseIso8601DurationMs', () => {
  it('should parse ISO 8601 duration to milliseconds', () => {
    expect(parseIso8601DurationMs('PT1S')).toBe(1000);
    expect(parseIso8601DurationMs('PT1M')).toBe(1000 * 60);
    expect(parseIso8601DurationMs('PT1H')).toBe(1000 * 60 * 60);
    expect(parseIso8601DurationMs('P1D')).toBe(1000 * 60 * 60 * 24);
    // Months are not expected to be used with this parser, so it
    // only provides an approximation as 30 days.
    expect(parseIso8601DurationMs('P1M')).toBe(1000 * 60 * 60 * 24 * 30);
    // Years are not expected to be used with this parser, so it
    // only provides an approximation as 365 days.
    expect(parseIso8601DurationMs('P1Y')).toBe(1000 * 60 * 60 * 24 * 365);

    expect(parseIso8601DurationMs('P1Y1M1DT1H1M1S')).toBe(
      1000 * 60 * 60 * 24 * 365 + 1000 * 60 * 60 * 24 * 30 + 1000 * 60 * 60 * 24 + 1000 * 60 * 60 + 1000 * 60 + 1000,
    );
  });
});
