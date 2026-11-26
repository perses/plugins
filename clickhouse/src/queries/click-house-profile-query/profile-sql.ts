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

import { asSubquery } from '../../model/sql';

// `COLUMNS('pattern') APPLY function` selects the columns matching the pattern, and nothing when there is none:
// it reads the optional columns of the samples without knowing whether the query returns them.
const SUM_OF_VALUES = "COLUMNS('(?i)^value$') APPLY sum";

/**
 * buildFlameQuery returns the statement adding up the samples of a profile query by stack. ClickHouse does the
 * aggregation, so a profile of millions of samples comes back as one row per distinct stack.
 */
export function buildFlameQuery(profileQuery: string): string {
  return [
    `SELECT stack, count() AS samples, ${SUM_OF_VALUES}, COLUMNS('(?i)^(name|unit)$') APPLY any`,
    `FROM ${asSubquery(profileQuery)}`,
    'GROUP BY stack',
  ].join('\n');
}

/**
 * buildTimelineQuery returns the statement adding up the samples of a profile query by time bucket. The buckets are
 * the first column of its result. Without a `time` column, the result has no bucket: only the total of the samples.
 */
export function buildTimelineQuery(profileQuery: string, stepSeconds: number): string {
  const bucket = `t -> toUnixTimestamp(toStartOfInterval(toDateTime(t), INTERVAL ${stepSeconds} second))`;
  return [
    `SELECT COLUMNS('(?i)^time$') APPLY (${bucket}), count() AS samples, ${SUM_OF_VALUES}`,
    `FROM ${asSubquery(profileQuery)}`,
    'GROUP BY ALL',
  ].join('\n');
}
