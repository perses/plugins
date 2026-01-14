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

import { LogEntry } from '@perses-dev/core';

/**
 * Formats a timestamp for display in copied text
 */
export function formatTimestamp(timestamp: number | string): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : parseTimestamp(timestamp);
  return date.toISOString();
}

/**
 * Parses a timestamp string to a Date object
 */
function parseTimestamp(timestamp: string): Date {
  return /^\d+$/.test(timestamp) ? new Date(parseInt(timestamp) * 1000) : new Date(Date.parse(timestamp));
}

/**
 * Formats labels as key=value pairs
 */
export function formatLabels(labels: Record<string, string>): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) return '';
  return entries.map(([key, value]) => `${key}="${value}"`).join(' ');
}

/**
 * Formats a single log entry as plain text for copying
 * Format: {timestamp} {labels} {message}
 */
export function formatLogEntry(log: LogEntry): string {
  const timestamp = formatTimestamp(log.timestamp);
  const labels = formatLabels(log.labels || {});
  return labels ? `${timestamp} ${labels} ${log.line}` : `${timestamp} ${log.line}`;
}

/**
 * Formats just the log message text (no timestamp or labels)
 */
export function formatLogMessage(log: LogEntry): string {
  return log.line;
}

/**
 * Formats a log entry as JSON
 */
export function formatLogAsJson(log: LogEntry): string {
  return JSON.stringify(log, null, 2);
}

/**
 * Formats multiple log entries as plain text for copying
 * Each log entry is on its own line
 */
export function formatLogEntries(logs: LogEntry[]): string {
  return logs.map(formatLogEntry).join('\n');
}
