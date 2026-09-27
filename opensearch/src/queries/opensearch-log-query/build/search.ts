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

import { DEFAULT_SEARCH_SIZE, DEFAULT_TIMESTAMP_FIELDS } from '../../constants';

export interface SearchBodyOptions {
  timestampField?: string;
  disableTimeFilter?: boolean;
  /** `_search` size. Defaults to DEFAULT_SEARCH_SIZE. */
  limit?: number;
}

// Single source of truth for the default timestamp field, shared with build/ppl.ts.
// Non-null assertion: DEFAULT_TIMESTAMP_FIELDS is a non-empty literal array, so index 0
// always exists — `noUncheckedIndexedAccess` just can't see that from the `string[]` type.
export const DEFAULT_TIMESTAMP_FIELD = DEFAULT_TIMESTAMP_FIELDS[0]!;

/** A `range` clause bounding the timestamp field to the panel window, in epoch milliseconds. */
export function buildTimeRangeFilter(timestampField: string, start: Date, end: Date): Record<string, unknown> {
  return {
    range: {
      [timestampField]: {
        gte: start.getTime(),
        lte: end.getTime(),
        format: 'epoch_millis',
      },
    },
  };
}

/**
 * Newest-first, which is what a log panel wants — log panels do not sort entries
 * themselves. `unmapped_type` keeps a wildcard index pattern working when one of the
 * matched indices has no such field, which would otherwise fail the shard.
 */
export function buildDefaultSort(timestampField: string): Array<Record<string, unknown>> {
  return [{ [timestampField]: { order: 'desc', unmapped_type: 'boolean' } }];
}

export function resolveSize(limit?: number): number {
  return limit ?? DEFAULT_SEARCH_SIZE;
}
