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

describe('toNanoString (GreptimeDB SQL columns with data_type)', () => {
  it('should return undefined for nullish values', () => {
    expect(toNanoString(null, 'TimestampNanosecond')).toBeUndefined();
    expect(toNanoString(undefined, 'TimestampNanosecond')).toBeUndefined();
  });

  it('should scale Timestamp* columns (opentelemetry_traces timestamp / timestamp_end)', () => {
    expect(toNanoString(1_700_000_000_000_000_000, 'TimestampNanosecond')).toBe('1700000000000000000');
    expect(toNanoString(1_700_000_000_000_000, 'TimestampMicrosecond')).toBe('1700000000000000000');
    expect(toNanoString(1_700_000_000_000, 'TimestampMillisecond')).toBe('1700000000000000000');
    expect(toNanoString(1_700_000_000, 'TimestampSecond')).toBe('1700000000000000000');
  });

  it('should not scale Int64 duration_nano', () => {
    expect(toNanoString(4_169_970, 'Int64')).toBe('4169970');
    expect(toNanoString(4_169_970, 'UInt64')).toBe('4169970');
  });

  it('should parse numeric strings from SQL API', () => {
    expect(toNanoString('1700000000000000000', 'TimestampNanosecond')).toBe('1700000000000000000');
  });

  it('should return undefined for non-numeric strings', () => {
    expect(toNanoString('2023-11-14T22:13:20.000Z', 'TimestampNanosecond')).toBeUndefined();
  });

  it('should throw for unsupported data_type on numeric values', () => {
    expect(() => toNanoString(1, 'String')).toThrow('Unsupported GreptimeDB data_type');
  });
});
