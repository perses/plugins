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

import { LogsColumnDefinition, LogsColumnSortMode } from '../model';

export interface ResolvedColumn {
  name: string;
  header: string;
  type: 'timestamp' | 'line' | 'label';
  enableSorting: boolean;
  sortMode: LogsColumnSortMode;
  allowWrap: boolean;
  width?: number;
}

/**
 * Resolves column definitions into a list of concrete columns for rendering.
 *
 * Precedence: when `columns` is defined and non-empty, it is the sole source
 * of truth and `showTime` is ignored. When `columns` is undefined or empty,
 * `showTime` controls whether the default timestamp column is included
 * (defaults to true when undefined).
 */
export function resolveColumns(
  columns: LogsColumnDefinition[] | undefined,
  showTime: boolean | undefined,
  globalAllowWrap: boolean | undefined
): ResolvedColumn[] {
  if (!columns || columns.length === 0) {
    const defaults: ResolvedColumn[] = [];
    if (showTime !== false) {
      defaults.push({
        name: 'timestamp',
        header: 'Timestamp',
        type: 'timestamp',
        enableSorting: true,
        sortMode: 'timestamp',
        allowWrap: false,
      });
    }
    defaults.push({
      name: 'line',
      header: 'Log line',
      type: 'line',
      enableSorting: false,
      sortMode: 'alphabetical',
      allowWrap: globalAllowWrap ?? true,
    });
    return defaults;
  }

  return columns.map((col): ResolvedColumn => {
    const type: ResolvedColumn['type'] =
      col.name === 'timestamp' ? 'timestamp' : col.name === 'line' ? 'line' : 'label';

    return {
      name: col.name,
      header: col.header ?? col.name,
      type,
      enableSorting: col.enableSorting !== false,
      sortMode: col.sortMode ?? (type === 'timestamp' ? 'timestamp' : 'alphabetical'),
      allowWrap: col.allowWrap ?? false,
      width: col.width,
    };
  });
}

/**
 * Builds a CSS grid-template-columns string from resolved columns.
 */
export function buildGridTemplate(columns: ResolvedColumn[], isExpandable: boolean): string {
  const parts: string[] = [];

  if (isExpandable) {
    parts.push('16px');
  }

  for (const col of columns) {
    if (col.width) {
      parts.push(`${col.width}px`);
    } else {
      switch (col.type) {
        case 'timestamp':
          parts.push('190px');
          break;
        case 'line':
          parts.push('1fr');
          break;
        case 'label':
          parts.push('150px');
          break;
      }
    }
  }

  parts.push('min-content');

  return parts.join(' ');
}
