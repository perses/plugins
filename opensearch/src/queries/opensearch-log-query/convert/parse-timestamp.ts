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

export function parseTimestamp(v: unknown): number {
  if (v === null || v === undefined) return 0;

  // Numeric epochs arrive in seconds, milliseconds, microseconds, or nanoseconds
  // (logs frequently carry ns precision). They come as a JS number, or — when the
  // value exceeds Number.MAX_SAFE_INTEGER (a ns epoch is ~1e18, well past 2^53) — as
  // a numeric string so it survives JSON parsing without silent overflow. `_search`
  // hits are flattened to strings, so a fractional epoch (`1700000000.5`) also arrives
  // as a numeric string and must not fall through to Date.parse.
  // We emit seconds (LogEntry is second-resolution), so we only need the correct
  // magnitude, not sub-second precision: a float's rounding at the ns scale is far
  // below one second and is discarded anyway, so BigInt isn't required here.
  let numeric = NaN;
  if (typeof v === 'number') {
    numeric = v;
  } else if (/^\d+(\.\d+)?$/.test(String(v))) {
    numeric = Number(v);
  }
  if (!Number.isNaN(numeric)) {
    // Detect the unit by magnitude — a value past year ~5138 for a given unit must
    // really be a finer unit — and normalize to seconds. Without the µs/ns tiers
    // those values would parse far in the future.
    if (numeric >= 1e17) return numeric / 1e9; // nanoseconds → seconds
    if (numeric >= 1e14) return numeric / 1e6; // microseconds → seconds
    if (numeric >= 1e11) return numeric / 1e3; // milliseconds → seconds
    return numeric; // seconds
  }

  // OpenSearch PPL returns timestamp/datetime fields as space-separated UTC strings
  // with no timezone designator (e.g. "2020-08-26 13:49:00"). Date.parse treats a
  // zoneless date-time as *local* time, which would shift the value by the browser's
  // offset, so normalize it to explicit UTC (replace the space with `T`, append `Z`)
  // before parsing. Strings that already carry a zone (…Z / ±hh:mm) or are date-only
  // are left untouched — the spec parses those as UTC already.
  const str = String(v).trim();
  const zonelessDateTime = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/;
  const iso = zonelessDateTime.test(str) ? `${str.replace(' ', 'T')}Z` : str;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? 0 : parsed / 1000;
}
