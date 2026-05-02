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

import { Alert } from '@perses-dev/spec';
import { ColumnSortMode, SortDirection } from './alert-table-model';
import { getSeverityWeight, SEVERITY_ORDER } from './label-colors';

export interface SortState {
  columnName: string;
  direction: SortDirection;
  mode: ColumnSortMode;
}

function directionMultiplier(direction: SortDirection): number {
  return direction === 'asc' ? 1 : -1;
}

function compareAlphabetical(a: string | undefined, b: string | undefined): number {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return a.localeCompare(b);
}

function compareNumeric(a: string | undefined, b: string | undefined): number {
  const na = a !== undefined ? parseFloat(a) : NaN;
  const nb = b !== undefined ? parseFloat(b) : NaN;
  if (isNaN(na) && isNaN(nb)) return 0;
  if (isNaN(na)) return 1;
  if (isNaN(nb)) return -1;
  return na - nb;
}

function compareSeverity(a: string | undefined, b: string | undefined): number {
  const wa = a !== undefined ? getSeverityWeight(a) : SEVERITY_ORDER.length;
  const wb = b !== undefined ? getSeverityWeight(b) : SEVERITY_ORDER.length;
  return wa - wb;
}

export function compareAlertsByColumn(a: Alert, b: Alert, sort: SortState): number {
  const va = a.labels[sort.columnName];
  const vb = b.labels[sort.columnName];
  let result: number;

  switch (sort.mode) {
    case 'numeric':
      result = compareNumeric(va, vb);
      break;
    case 'severity':
      result = compareSeverity(va, vb);
      break;
    case 'alphabetical':
    default:
      result = compareAlphabetical(va, vb);
      break;
  }

  return result * directionMultiplier(sort.direction);
}

function getMostFrequentValue(counts: Record<string, number>): { value: string | undefined; count: number } {
  let maxCount = 0;
  let maxValue: string | undefined;
  for (const [value, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxValue = value;
    }
  }
  return { value: maxValue, count: maxCount };
}

function getMostCriticalSeverity(counts: Record<string, number>): { weight: number; count: number } {
  let minWeight = SEVERITY_ORDER.length;
  let countAtMin = 0;
  for (const [value, count] of Object.entries(counts)) {
    const weight = getSeverityWeight(value);
    if (weight < minWeight) {
      minWeight = weight;
      countAtMin = count;
    } else if (weight === minWeight) {
      countAtMin += count;
    }
  }
  return { weight: minWeight, count: countAtMin };
}

export function compareGroupsByColumn(
  aCounts: Record<string, number> | undefined,
  bCounts: Record<string, number> | undefined,
  sort: SortState
): number {
  const emptyA = !aCounts || Object.keys(aCounts).length === 0;
  const emptyB = !bCounts || Object.keys(bCounts).length === 0;
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;

  let result: number;

  switch (sort.mode) {
    case 'severity': {
      const sevA = getMostCriticalSeverity(aCounts);
      const sevB = getMostCriticalSeverity(bCounts);
      result = sevA.weight - sevB.weight;
      if (result === 0) {
        result = sevB.count - sevA.count;
      }
      break;
    }
    case 'numeric': {
      const freqA = getMostFrequentValue(aCounts);
      const freqB = getMostFrequentValue(bCounts);
      const numResult = compareNumeric(freqA.value, freqB.value);
      if (numResult !== 0) {
        return numResult * directionMultiplier(sort.direction);
      }
      // Tie-break by count is always descending (larger groups first) regardless of sort direction
      return freqB.count - freqA.count;
    }
    case 'alphabetical':
    default: {
      const freqA = getMostFrequentValue(aCounts);
      const freqB = getMostFrequentValue(bCounts);
      const alphaResult = compareAlphabetical(freqA.value, freqB.value);
      if (alphaResult !== 0) {
        return alphaResult * directionMultiplier(sort.direction);
      }
      // Tie-break by count is always descending (larger groups first) regardless of sort direction
      return freqB.count - freqA.count;
    }
  }

  return result * directionMultiplier(sort.direction);
}
