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

// Until Temporal is available in Typescript, provide a simple parser for ISO 8601 durations.
// Absolutely does not handle the full specification.
const ISO_8601_DURATION_REGEX = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_MONTH = 30; // Approximate month as 30 days
const DAYS_PER_YEAR = 365; // Approximate year as 365 days

// Converts an ISO 8601 duration string (e.g. "PT5M", "P1D") to a duration in milliseconds.
export function parseIso8601DurationMs(duration: string): number {
  const match = ISO_8601_DURATION_REGEX.exec(duration.trim());
  if (!match || match[0] === 'P') {
    throw new Error(`Invalid ISO 8601 duration: ${duration}`);
  }

  const [, years, months, days, hours, minutes, seconds] = match;
  return (
    Number(years ?? 0) * DAYS_PER_YEAR * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND +
    Number(months ?? 0) * DAYS_PER_MONTH * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND +
    Number(days ?? 0) * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND +
    Number(hours ?? 0) * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND +
    Number(minutes ?? 0) * SECONDS_PER_MINUTE * MS_PER_SECOND +
    Number(seconds ?? 0) * MS_PER_SECOND
  );
}
