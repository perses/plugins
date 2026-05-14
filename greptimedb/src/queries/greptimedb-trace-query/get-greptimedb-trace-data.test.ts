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

import { toNanoString } from './get-greptimedb-trace-data';

describe('toNanoString', () => {
  it('should return undefined for nullish values', () => {
    expect(toNanoString(null, 'TimestampMillisecond')).toBeUndefined();
    expect(toNanoString(undefined, 'TimestampMillisecond')).toBeUndefined();
  });

  it('should convert typed numeric timestamps to nanoseconds', () => {
    expect(toNanoString(1_000_000_000, 'TimestampNanosecond')).toBe('1000000000');
    expect(toNanoString(1_000_000_000, 'TimestampMicrosecond')).toBe('1000000000000');
    expect(toNanoString(1_700_000_000_000, 'TimestampMillisecond')).toBe('1700000000000000000');
    expect(toNanoString(1_700_000_000, 'TimestampSecond')).toBe('1700000000000000000');
  });

  it('should infer units for numeric timestamps without data type', () => {
    expect(toNanoString(1_700_000_000_000_000, undefined)).toBe('1700000000000000');
    expect(toNanoString(1_700_000_000_000, undefined)).toBe('1700000000000000000');
    expect(toNanoString(1_700_000_000, undefined)).toBe('1700000000000000000');
  });

  it('should parse numeric strings and date strings', () => {
    expect(toNanoString('1700000000000', 'TimestampMillisecond')).toBe('1700000000000000000');
    expect(toNanoString('2023-11-14T22:13:20.000Z', 'TimestampMillisecond')).toBe('1700000000000000000');
  });

  it('should return undefined for invalid date strings', () => {
    expect(toNanoString('not-a-timestamp', 'TimestampMillisecond')).toBeUndefined();
  });
});
