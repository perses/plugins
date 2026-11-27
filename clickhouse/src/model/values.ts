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

const NANOS_PER_MILLI = 1_000_000n;

// `2026-11-26`, `2026-11-26 11:59:14.380493800` (ClickHouse default) or `2026-11-26T11:59:14.380493800Z` (ISO).
const DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?)?(?:\s*(Z|[+-]\d{2}:?\d{2}))?$/;
const UNSIGNED_INTEGER = /^\d+$/;
const DECIMAL_NUMBER = /^-?\d+(?:\.\d+)?$/;

const zoneFormatters = new Map<string, Intl.DateTimeFormat | null>();

function zoneFormatter(timeZone: string): Intl.DateTimeFormat | null {
  let formatter = zoneFormatters.get(timeZone);
  if (formatter === undefined) {
    try {
      formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hourCycle: 'h23',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      formatter = null;
    }
    zoneFormatters.set(timeZone, formatter);
  }
  return formatter;
}

// Offset of the zone, in milliseconds, at the given instant.
function zoneOffset(formatter: Intl.DateTimeFormat, instant: number): number {
  const parts: Record<string, number> = {};
  for (const { type, value } of formatter.formatToParts(instant)) {
    parts[type] = Number(value);
  }
  const wall = Date.UTC(
    parts.year ?? 0,
    (parts.month ?? 1) - 1,
    parts.day ?? 1,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0,
  );
  return wall - (instant - (((instant % 1000) + 1000) % 1000));
}

// Converts a wall-clock time, encoded as if it were UTC, to the instant it designates in an IANA time zone.
function wallTimeToInstant(wallAsUtc: number, timeZone: string): number {
  const formatter = zoneFormatter(timeZone);
  if (!formatter) return wallAsUtc;
  const firstGuess = wallAsUtc - zoneOffset(formatter, wallAsUtc);
  return wallAsUtc - zoneOffset(formatter, firstGuess);
}

interface ParsedDateTime {
  /** Whole seconds since the Unix epoch, in milliseconds. */
  secondsMs: number;
  /** Fraction of the second, as up to 9 digits. */
  fraction: string;
}

function parseDateTime(value: string, timeZone: string | undefined): ParsedDateTime | undefined {
  const match = DATE_TIME.exec(value.trim());
  if (!match) return undefined;
  const [, year, month, day, hour = '00', minute = '00', second = '00', fraction = '', offset] = match;
  const wall = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  if (!Number.isFinite(wall)) return undefined;
  if (offset === undefined) {
    // Without a zone the value is a wall-clock time of the column or server time zone.
    const utc = timeZone === undefined || timeZone === 'UTC' ? wall : wallTimeToInstant(wall, timeZone);
    return { secondsMs: utc, fraction };
  }
  if (offset === 'Z') return { secondsMs: wall, fraction };
  const sign = offset.startsWith('-') ? -1 : 1;
  const digits = offset.slice(1).replace(':', '');
  const offsetMs = sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2, 4))) * 60_000;
  return { secondsMs: wall - offsetMs, fraction };
}

// A bare number is an epoch timestamp whose unit is told apart by its magnitude: the four units are at least three
// orders of magnitude apart for any date between 1973 and 5138.
function epochToNano(value: number): bigint | undefined {
  if (!Number.isFinite(value)) return undefined;
  const magnitude = Math.abs(value);
  if (magnitude < 1e11) return BigInt(Math.round(value * 1e3)) * NANOS_PER_MILLI;
  if (magnitude < 1e14) return BigInt(Math.round(value)) * NANOS_PER_MILLI;
  if (magnitude < 1e17) return BigInt(Math.round(value)) * 1000n;
  return BigInt(Math.round(value));
}

/**
 * toUnixNano reads a ClickHouse date, date/time or epoch number as nanoseconds since the Unix epoch.
 * It returns undefined when the value is not a timestamp. `timeZone` applies to values without a zone.
 */
export function toUnixNano(value: unknown, timeZone?: string): bigint | undefined {
  if (typeof value === 'number') return epochToNano(value);
  if (typeof value !== 'string' || value === '') return undefined;
  if (UNSIGNED_INTEGER.test(value)) {
    // Quoted 64-bit integers keep their precision: do not go through a double.
    const integer = BigInt(value);
    if (integer >= 100_000_000_000_000_000n) return integer;
    return epochToNano(Number(value));
  }
  if (DECIMAL_NUMBER.test(value)) return epochToNano(Number(value));
  const parsed = parseDateTime(value, timeZone);
  if (!parsed) return undefined;
  return BigInt(parsed.secondsMs) * NANOS_PER_MILLI + BigInt(parsed.fraction.padEnd(9, '0'));
}

/**
 * toUnixMs reads a ClickHouse date, date/time or epoch number as milliseconds since the Unix epoch.
 * It returns NaN when the value is not a timestamp. `timeZone` applies to values without a zone.
 */
export function toUnixMs(value: unknown, timeZone?: string): number {
  if (typeof value === 'string' && value !== '' && !DECIMAL_NUMBER.test(value)) {
    const parsed = parseDateTime(value, timeZone);
    if (!parsed) return NaN;
    return parsed.secondsMs + Math.floor(Number(parsed.fraction.padEnd(3, '0').slice(0, 3)));
  }
  const nanos = toUnixNano(value, timeZone);
  return nanos === undefined ? NaN : Number(nanos / NANOS_PER_MILLI);
}

/** toNumber reads a ClickHouse number, including quoted 64-bit integers and booleans, or null when it is not one. */
export function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

/** isRecord reports whether the value is a JSON object, as ClickHouse returns for `Map`, `Tuple` and `JSON` values. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** toText renders a ClickHouse value as text: strings as they are, null as an empty string, the rest as JSON. */
export function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/**
 * addLabels flattens a value into labels: an object adds one label per leaf, named `<name>.<path>`, and any other
 * value adds a single label. Null values are left out.
 */
export function addLabels(labels: Record<string, string>, name: string, value: unknown): void {
  if (value === null || value === undefined) return;
  if (isRecord(value)) {
    for (const key of Object.keys(value)) {
      addLabels(labels, `${name}.${key}`, value[key]);
    }
    return;
  }
  labels[name] = toText(value);
}
