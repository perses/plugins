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
import { Sample } from '../components/FlameChart';
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

        // change the parents' values (todo : verify this)
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
 * Build series data for the flame chart option
 */
export function recursionJson(
  palette: string,
  metadata: ProfileMetaData | undefined,
  jsonObj: StackTrace,
  id?: number
): Sample[] {
  const data: Sample[] = [];
  const filteredJson = filterJson(structuredClone(jsonObj), id);

  const rootVal = filteredJson.total; // total samples of root node

  const recur = (item: StackTrace): void => {
    const temp = {
      name: item.id,
      value: [
        item.level,
        item.start,
        item.end,
        formatName(item, rootVal, metadata?.units),
        (item.total / rootVal) * 100,
        (item.self / rootVal) * 100,
        item.name,
        item.self,
        item.total,
      ],
      itemStyle: {
        color: getSpanColor(palette, item.name, (item.total / rootVal) * 100),
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
