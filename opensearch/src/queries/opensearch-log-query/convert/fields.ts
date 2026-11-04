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

import { DEFAULT_MESSAGE_FIELDS, DEFAULT_TIMESTAMP_FIELDS } from '../../constants';

export interface ConvertOptions {
  timestampField?: string;
  messageField?: string;
}

/**
 * The field names to try, in order, for the timestamp and the log line: the configured
 * override first, then the defaults as fallbacks. Shared by both converters so PPL/SQL and
 * Lucene/DSL pick the same fields for the same index.
 */
export function fieldCandidates(options: ConvertOptions): { timestamp: string[]; message: string[] } {
  return {
    timestamp: options.timestampField
      ? [options.timestampField, ...DEFAULT_TIMESTAMP_FIELDS]
      : DEFAULT_TIMESTAMP_FIELDS,
    message: options.messageField ? [options.messageField, ...DEFAULT_MESSAGE_FIELDS] : DEFAULT_MESSAGE_FIELDS,
  };
}

/**
 * Flatten a document to dot-separated keys, because LogEntry labels are a flat
 * `Record<string, string>`. Arrays are JSON-stringified rather than indexed, since
 * `tags.0`/`tags.1` labels are noise; null/undefined values are dropped so they do not
 * render as the strings "null"/"undefined".
 */
export function flattenSource(source: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};

  const walk = (value: unknown, prefix: string): void => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      out[prefix] = JSON.stringify(value);
      return;
    }
    if (typeof value === 'object') {
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        walk(child, prefix ? `${prefix}.${key}` : key);
      }
      return;
    }
    out[prefix] = String(value);
  };

  for (const [key, value] of Object.entries(source)) {
    walk(value, key);
  }

  return out;
}
