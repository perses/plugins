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

import { toTimestampMs } from './greptimedb-query-data-model';

describe('toTimestampMs', () => {
  it('should return null for nullish values', () => {
    expect(toTimestampMs(null, 'TimestampMillisecond')).toBeNull();
    expect(toTimestampMs(undefined, 'TimestampMillisecond')).toBeNull();
  });

  it('should convert typed numeric timestamps to milliseconds', () => {
    expect(toTimestampMs(1_700_000_000_000_000_000, 'TimestampNanosecond')).toBe(1_700_000_000_000);
    expect(toTimestampMs(1_700_000_000_000_000, 'TimestampMicrosecond')).toBe(1_700_000_000_000);
    expect(toTimestampMs(1_700_000_000_000, 'TimestampMillisecond')).toBe(1_700_000_000_000);
    expect(toTimestampMs(1_700_000_000, 'TimestampSecond')).toBe(1_700_000_000_000);
  });

  it('should infer units for numeric timestamps without data type', () => {
    expect(toTimestampMs(1_700_000_000_000_000_000, undefined)).toBe(1_700_000_000_000);
    expect(toTimestampMs(1_700_000_000_000, undefined)).toBe(1_700_000_000_000);
    expect(toTimestampMs(1_700_000_000, undefined)).toBe(1_700_000_000_000);
  });

  it('should parse numeric strings and date strings', () => {
    expect(toTimestampMs('1700000000000', 'TimestampMillisecond')).toBe(1_700_000_000_000);
    expect(toTimestampMs('2023-11-14T22:13:20.000Z', 'TimestampMillisecond')).toBe(1_700_000_000_000);
  });

  it('should return null for invalid date strings', () => {
    expect(toTimestampMs('not-a-timestamp', 'TimestampMillisecond')).toBeNull();
  });
});
