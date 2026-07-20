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

import { LogsColumnDefinition } from '../model';
import { resolveColumns, buildGridTemplate, ResolvedColumn } from './column-resolution';

describe('resolveColumns', () => {
  describe('default columns (undefined or empty)', () => {
    it('should produce timestamp and line columns when showTime is not false', () => {
      const result = resolveColumns(undefined, undefined, undefined);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'timestamp',
        header: 'Timestamp',
        type: 'timestamp',
        enableSorting: true,
        sortMode: 'timestamp',
        allowWrap: false,
      });
      expect(result[1]).toEqual({
        name: 'line',
        header: 'Log line',
        type: 'line',
        enableSorting: false,
        sortMode: 'alphabetical',
        allowWrap: true,
      });
    });

    it('should produce only line column when showTime is false', () => {
      const result = resolveColumns(undefined, false, undefined);
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe('line');
    });

    it('should produce defaults when columns is empty array', () => {
      const result = resolveColumns([], undefined, undefined);
      expect(result).toHaveLength(2);
    });

    it('should respect globalAllowWrap for default line column', () => {
      const result = resolveColumns(undefined, undefined, false);
      expect(result[1]!.allowWrap).toBe(false);
    });
  });

  describe('custom columns', () => {
    it('should ignore showTime when custom columns are defined', () => {
      const columns: LogsColumnDefinition[] = [{ name: 'timestamp' }, { name: 'line' }];
      const result = resolveColumns(columns, false, undefined);
      expect(result).toHaveLength(2);
      expect(result[0]!.type).toBe('timestamp');
    });

    it('should map timestamp column correctly', () => {
      const columns: LogsColumnDefinition[] = [{ name: 'timestamp' }];
      const result = resolveColumns(columns, undefined, undefined);
      expect(result[0]).toEqual({
        name: 'timestamp',
        header: 'timestamp',
        type: 'timestamp',
        enableSorting: true,
        sortMode: 'timestamp',
        allowWrap: false,
      });
    });

    it('should map line column correctly', () => {
      const columns: LogsColumnDefinition[] = [{ name: 'line' }];
      const result = resolveColumns(columns, undefined, undefined);
      expect(result[0]).toEqual({
        name: 'line',
        header: 'line',
        type: 'line',
        enableSorting: true,
        sortMode: 'alphabetical',
        allowWrap: false,
      });
    });

    it('should map label column correctly', () => {
      const columns: LogsColumnDefinition[] = [{ name: 'service' }];
      const result = resolveColumns(columns, undefined, undefined);
      expect(result[0]).toEqual({
        name: 'service',
        header: 'service',
        type: 'label',
        enableSorting: true,
        sortMode: 'alphabetical',
        allowWrap: false,
      });
    });

    it('should use custom header when provided', () => {
      const columns: LogsColumnDefinition[] = [{ name: 'service', header: 'Service Name' }];
      const result = resolveColumns(columns, undefined, undefined);
      expect(result[0]!.header).toBe('Service Name');
    });

    it('should respect enableSorting false', () => {
      const columns: LogsColumnDefinition[] = [{ name: 'line', enableSorting: false }];
      const result = resolveColumns(columns, undefined, undefined);
      expect(result[0]!.enableSorting).toBe(false);
    });

    it('should use custom sortMode', () => {
      const columns: LogsColumnDefinition[] = [{ name: 'count', sortMode: 'numeric' }];
      const result = resolveColumns(columns, undefined, undefined);
      expect(result[0]!.sortMode).toBe('numeric');
    });

    it('should respect column allowWrap', () => {
      const columns: LogsColumnDefinition[] = [{ name: 'service', allowWrap: true }];
      const result = resolveColumns(columns, undefined, undefined);
      expect(result[0]!.allowWrap).toBe(true);
    });

    it('should pass through custom width', () => {
      const columns: LogsColumnDefinition[] = [{ name: 'service', width: 200 }];
      const result = resolveColumns(columns, undefined, undefined);
      expect(result[0]!.width).toBe(200);
    });

    it('should default allowWrap to false for custom line column', () => {
      const columns: LogsColumnDefinition[] = [{ name: 'line' }];
      const result = resolveColumns(columns, undefined, undefined);
      expect(result[0]!.allowWrap).toBe(false);
    });
  });
});

describe('buildGridTemplate', () => {
  it('should build template for default expandable columns', () => {
    const columns: ResolvedColumn[] = [
      {
        name: 'timestamp',
        header: 'Timestamp',
        type: 'timestamp',
        enableSorting: true,
        sortMode: 'timestamp',
        allowWrap: false,
      },
      {
        name: 'line',
        header: 'Log line',
        type: 'line',
        enableSorting: false,
        sortMode: 'alphabetical',
        allowWrap: true,
      },
    ];
    const result = buildGridTemplate(columns, true);
    expect(result).toBe('16px 190px 1fr min-content');
  });

  it('should build template without expand column when not expandable', () => {
    const columns: ResolvedColumn[] = [
      {
        name: 'timestamp',
        header: 'Timestamp',
        type: 'timestamp',
        enableSorting: true,
        sortMode: 'timestamp',
        allowWrap: false,
      },
      {
        name: 'line',
        header: 'Log line',
        type: 'line',
        enableSorting: false,
        sortMode: 'alphabetical',
        allowWrap: true,
      },
    ];
    const result = buildGridTemplate(columns, false);
    expect(result).toBe('190px 1fr min-content');
  });

  it('should handle label columns', () => {
    const columns: ResolvedColumn[] = [
      {
        name: 'service',
        header: 'Service',
        type: 'label',
        enableSorting: true,
        sortMode: 'alphabetical',
        allowWrap: false,
      },
      {
        name: 'line',
        header: 'Log line',
        type: 'line',
        enableSorting: false,
        sortMode: 'alphabetical',
        allowWrap: true,
      },
    ];
    const result = buildGridTemplate(columns, true);
    expect(result).toBe('16px 150px 1fr min-content');
  });

  it('should handle all column types with expand', () => {
    const columns: ResolvedColumn[] = [
      {
        name: 'timestamp',
        header: 'Time',
        type: 'timestamp',
        enableSorting: true,
        sortMode: 'timestamp',
        allowWrap: false,
      },
      {
        name: 'service',
        header: 'Service',
        type: 'label',
        enableSorting: true,
        sortMode: 'alphabetical',
        allowWrap: false,
      },
      {
        name: 'line',
        header: 'Message',
        type: 'line',
        enableSorting: false,
        sortMode: 'alphabetical',
        allowWrap: true,
      },
    ];
    const result = buildGridTemplate(columns, true);
    expect(result).toBe('16px 190px 150px 1fr min-content');
  });

  it('should use custom width when specified on a column', () => {
    const columns: ResolvedColumn[] = [
      {
        name: 'timestamp',
        header: 'Time',
        type: 'timestamp',
        enableSorting: true,
        sortMode: 'timestamp',
        allowWrap: false,
        width: 250,
      },
      {
        name: 'service',
        header: 'Service',
        type: 'label',
        enableSorting: true,
        sortMode: 'alphabetical',
        allowWrap: false,
        width: 200,
      },
      {
        name: 'line',
        header: 'Message',
        type: 'line',
        enableSorting: false,
        sortMode: 'alphabetical',
        allowWrap: true,
      },
    ];
    const result = buildGridTemplate(columns, true);
    expect(result).toBe('16px 250px 200px 1fr min-content');
  });
});
