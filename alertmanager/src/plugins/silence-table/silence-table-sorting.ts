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
import { SilenceColumnSortMode, SilenceFieldName, SortDirection, getSilenceFieldValue } from './silence-table-model';

export interface SilenceSortState {
  fieldName: SilenceFieldName;
  direction: SortDirection;
  mode: SilenceColumnSortMode;
}

const STATUS_WEIGHT: Record<string, number> = {
  active: 0,
  pending: 1,
  expired: 2,
};

function directionMultiplier(direction: SortDirection): number {
  return direction === 'asc' ? 1 : -1;
}

function compareAlphabetical(a: string, b: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}

function compareDate(a: string, b: string): number {
  const ta = a ? new Date(a).getTime() : NaN;
  const tb = b ? new Date(b).getTime() : NaN;
  if (isNaN(ta) && isNaN(tb)) return 0;
  if (isNaN(ta)) return 1;
  if (isNaN(tb)) return -1;
  return ta - tb;
}

function compareStatus(a: string, b: string): number {
  const wa = STATUS_WEIGHT[a] ?? 3;
  const wb = STATUS_WEIGHT[b] ?? 3;
  return wa - wb;
}

export function compareSilencesByColumn(a: Silence, b: Silence, sort: SilenceSortState): number {
  const va = getSilenceFieldValue(a, sort.fieldName);
  const vb = getSilenceFieldValue(b, sort.fieldName);
  let result: number;

  switch (sort.mode) {
    case 'date':
      result = compareDate(va, vb);
      break;
    case 'status':
      result = compareStatus(va, vb);
      break;
    case 'alphabetical':
    default:
      result = compareAlphabetical(va, vb);
      break;
  }

  return result * directionMultiplier(sort.direction);
}
