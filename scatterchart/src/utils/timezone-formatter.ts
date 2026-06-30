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

import { formatWithTimeZone } from '@perses-dev/components';

const DAY_MS = 86400000;
const YEAR_MS = 31536000000;

/**
 * Creates a timezone-aware axis formatter function for different time ranges
 */
export function createTimezoneAwareAxisFormatter(rangeMs: number, timeZone: string) {
  return function (value: number): string {
    const timeStamp = new Date(Number(value));

    // more than 5 years
    if (rangeMs > YEAR_MS * 5) {
      return formatWithTimeZone(timeStamp, 'yyyy', timeZone);
    }

    // more than 6 months
    if (rangeMs > DAY_MS * 180) {
      return formatWithTimeZone(timeStamp, 'MMM yyyy', timeZone);
    }

    // more than 10 days
    if (rangeMs > DAY_MS * 10) {
      return formatWithTimeZone(timeStamp, 'dd.MM', timeZone);
    }

    // more than 2 days
    if (rangeMs > DAY_MS * 2) {
      return formatWithTimeZone(timeStamp, 'dd.MM HH:mm', timeZone);
    }

    // less or equal 2 days
    return formatWithTimeZone(timeStamp, 'HH:mm', timeZone);
  };
}
