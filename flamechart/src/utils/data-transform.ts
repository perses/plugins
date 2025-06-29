// Copyright 2025 The Perses Authors
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

import { ProfileMetaData, StackTrace } from '@perses-dev/core';
import { FlameChartSample as Sample, TableChartSample } from './data-model';
import { getSpanColor } from './palette-gen';
import { formatItemValue } from './format';

/**
 * Filter the global stacktrace by a function ID to focus on that function and display its corresponding flame chart
 */
export function filterJson(json: StackTrace, id?: number): StackTrace {
  if (id === null) {
    return json;
  }

  const recur = (item: StackTrace, id?: number): StackTrace | undefined => {
    if (item.id === id) {
      return item;
    }

    for (const child of item.children || []) {
      const temp = recur(child, id);
      if (temp) {
        item.children = [temp];

        // change the parents' values
        item.start = temp.start;
        item.end = temp.end;
        // item.self = temp.self;
        // item.total = temp.total;

        return item;
      }
    }
  };

  return recur(json, id) || json;
}

// build the name of the corresponding flamechart item
function formatName(item: StackTrace, rootVal: number, unit: string | undefined): string {
  return (item.total / rootVal) * 100 < 1 ? '' : item.name + ` (${formatItemValue(unit, item.total)})`;
}

/**
 * Search the total value of an item corresponding to a given ID
 */
function getCurrentTotalValue(json: StackTrace, id: number | undefined): number {
  if (id === undefined) return 0;

  const recur = (item: StackTrace): number => {
    if (item.id === id) {
      return item.total;
    }

    for (const child of item.children || []) {
      const total = recur(child);
      if (total !== undefined) {
        return total;
      }
    }
    return 0; // If not found, return 0
  };

  return recur(json);
}

/**
 * Build series data for the flame chart option
 */
export function recursionJson(
  palette: string,
  metadata: ProfileMetaData | undefined,
  jsonObj: StackTrace,
  searchValue: string,
  id?: number
): Sample[] {
  const data: Sample[] = [];
  const filteredJson = filterJson(structuredClone(jsonObj), id);

  const rootVal = filteredJson.total; // total samples of root node
  const currentVal = getCurrentTotalValue(filteredJson, id); // total samples of the selected item, used to generate items colors

  const recur = (item: StackTrace): void => {
    const temp = {
      name: item.id,
      value: [
        item.level,
        item.start,
        item.end,
        formatName(item, currentVal ? currentVal : rootVal, metadata?.units),
        (item.total / rootVal) * 100,
        (item.self / rootVal) * 100,
        item.name,
        item.self,
        item.total,
      ],
      itemStyle: {
        color: !isItemNameMatchesSearchFilters(item.name, searchValue)
          ? '#dee2e6'
          : getSpanColor(palette, item.name, (item.total / (currentVal ? currentVal : rootVal)) * 100),
      },
    };
    data.push(temp as Sample);

    for (const child of item.children || []) {
      recur(child);
    }
  };

  // check is filteredJson is not empty before call recur
  if (filteredJson.id) recur(filteredJson);
  return data;
}

/**
 * Transform query results to a tabular format for the table chart
 */
export function tableRecursionJson(jsonObj: StackTrace, searchValue: string): TableChartSample[] {
  const data: TableChartSample[] = [];
  const structuredJson = structuredClone(jsonObj);

  const recur = (item: StackTrace): void => {
    const temp = {
      id: item.id,
      name: item.name,
      self: item.self,
      total: item.total,
    };

    if (isItemNameMatchesSearchFilters(temp.name, searchValue)) data.push(temp as TableChartSample);

    for (const child of item.children || []) {
      recur(child);
    }
  };

  // check is structuredJson is not empty before call recur
  if (structuredJson.id) recur(structuredJson);
  return data;
}

// Checks if an item name matches all parts of a search value.
function isItemNameMatchesSearchFilters(itemName: string, searchValue: string): boolean {
  if (searchValue === '') return true;

  const filters = searchValue
    .trim()
    .toLocaleLowerCase()
    .split(/[^a-zA-Z0-9']+/)
    .filter((s) => s !== '');

  if (filters.length === 0) {
    return false;
  } else {
    return filters.every((filter) => itemName.toLowerCase().includes(filter.trim()));
  }
}

/**
 * Finds the total sample value of the series data item with the specified name.
 */
export function findTotalSampleByName(seriesData: Sample[], name: number | undefined): number | undefined {
  if (name === undefined || name === 0) return undefined;
  const item = seriesData.find((item) => item.name === name);
  const totalSample = item?.value[8];
  return Number(totalSample);
}
