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

import { Silence } from '@perses-dev/spec';

export type SilenceAction = 'expire';

export const ALL_SILENCE_ACTIONS: SilenceAction[] = ['expire'];

export type SortDirection = 'asc' | 'desc';

export type SilenceColumnSortMode = 'alphabetical' | 'date' | 'status';

export type SilenceFieldName =
  | 'status'
  | 'matchers'
  | 'createdBy'
  | 'startsAt'
  | 'endsAt'
  | 'duration'
  | 'comment'
  | 'updatedAt';

export interface SilenceColumnDefinition {
  name: SilenceFieldName;
  header?: string;
  enableSorting?: boolean;
  sort?: SortDirection;
  sortMode?: SilenceColumnSortMode;
}

export const DEFAULT_COLUMN_HEADERS: Record<SilenceFieldName, string> = {
  status: 'Status',
  matchers: 'Matchers',
  createdBy: 'Creator',
  startsAt: 'Starts At',
  endsAt: 'Ends At',
  duration: 'Duration',
  comment: 'Comment',
  updatedAt: 'Updated At',
};

export const DEFAULT_SILENCE_COLUMNS: SilenceColumnDefinition[] = [
  { name: 'status', sort: 'asc', sortMode: 'status' },
  { name: 'matchers', enableSorting: false },
];

export function inferSortMode(field: SilenceFieldName): SilenceColumnSortMode {
  switch (field) {
    case 'status':
      return 'status';
    case 'startsAt':
    case 'endsAt':
    case 'updatedAt':
      return 'date';
    default:
      return 'alphabetical';
  }
}

export function getSilenceFieldValue(silence: Silence, field: SilenceFieldName): string {
  switch (field) {
    case 'status':
      return silence.state;
    case 'matchers':
      return silence.matchers.map((m) => `${m.name}=${m.value}`).join(', ');
    case 'createdBy':
      return silence.createdBy;
    case 'startsAt':
      return silence.startsAt;
    case 'endsAt':
      return silence.endsAt;
    case 'duration':
      return getSilenceDuration(silence);
    case 'comment':
      return silence.comment ?? '';
    case 'updatedAt':
      return silence.updatedAt ?? '';
  }
}

/**
 * Options for the SilenceTable panel plugin.
 */
export interface SilenceTableOptions {
  columns?: SilenceColumnDefinition[];
  allowedActions?: SilenceAction[];
}

/**
 * Calculate a human-readable duration string from a silence's start and end times.
 */
export function getSilenceDuration(silence: Silence): string {
  const startMs = new Date(silence.startsAt).getTime();
  const endMs = new Date(silence.endsAt).getTime();
  const diffMs = endMs - startMs;
  if (diffMs <= 0) return '0m';

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(' ') || '0m';
}
