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

import { render, screen, fireEvent } from '@testing-library/react';
import { ResolvedColumn } from './column-resolution';
import { SortState } from './logs-table-sorting';
import { LogsTableHeader } from './LogsTableHeader';

describe('LogsTableHeader', () => {
  const defaultColumns: ResolvedColumn[] = [
    {
      name: 'timestamp',
      header: 'Timestamp',
      type: 'timestamp',
      enableSorting: true,
      sortMode: 'timestamp',
      allowWrap: false,
    },
    { name: 'line', header: 'Log line', type: 'line', enableSorting: false, sortMode: 'alphabetical', allowWrap: true },
  ];

  const gridTemplate = '16px 190px 1fr min-content';

  it('should render column headers', () => {
    render(
      <LogsTableHeader
        resolvedColumns={defaultColumns}
        gridTemplateColumns={gridTemplate}
        isExpandable={true}
        actionCount={0}
        sortState={null}
        onSortClick={jest.fn()}
      />
    );
    expect(screen.getByText('Timestamp')).toBeInTheDocument();
    expect(screen.getByText('Log line')).toBeInTheDocument();
  });

  it('should render sortable columns with TableSortLabel', () => {
    render(
      <LogsTableHeader
        resolvedColumns={defaultColumns}
        gridTemplateColumns={gridTemplate}
        isExpandable={true}
        actionCount={0}
        sortState={null}
        onSortClick={jest.fn()}
      />
    );
    // Timestamp column is sortable, so it should be a button
    const timestampHeader = screen.getByText('Timestamp');
    expect(timestampHeader.closest('button, span[role="button"]')).not.toBeNull();
  });

  it('should show active sort indicator', () => {
    const sortState: SortState = { columnName: 'timestamp', direction: 'desc', mode: 'timestamp' };
    render(
      <LogsTableHeader
        resolvedColumns={defaultColumns}
        gridTemplateColumns={gridTemplate}
        isExpandable={true}
        actionCount={0}
        sortState={sortState}
        onSortClick={jest.fn()}
      />
    );
    // MUI TableSortLabel with active state adds an aria-sort or visual indicator
    const sortLabel = screen.getByText('Timestamp').closest('.MuiTableSortLabel-root');
    expect(sortLabel).toHaveClass('Mui-active');
  });

  it('should call onSortClick when clicking a sortable column', () => {
    const onSortClick = jest.fn();
    render(
      <LogsTableHeader
        resolvedColumns={defaultColumns}
        gridTemplateColumns={gridTemplate}
        isExpandable={true}
        actionCount={0}
        sortState={null}
        onSortClick={onSortClick}
      />
    );
    fireEvent.click(screen.getByText('Timestamp'));
    expect(onSortClick).toHaveBeenCalledWith(defaultColumns[0]);
  });

  it('should not render sort label for non-sortable columns', () => {
    render(
      <LogsTableHeader
        resolvedColumns={defaultColumns}
        gridTemplateColumns={gridTemplate}
        isExpandable={true}
        actionCount={0}
        sortState={null}
        onSortClick={jest.fn()}
      />
    );
    const logLineText = screen.getByText('Log line');
    expect(logLineText.closest('.MuiTableSortLabel-root')).toBeNull();
  });

  it('should render expand spacer when isExpandable is true', () => {
    const { container } = render(
      <LogsTableHeader
        resolvedColumns={defaultColumns}
        gridTemplateColumns={gridTemplate}
        isExpandable={true}
        actionCount={0}
        sortState={null}
        onSortClick={jest.fn()}
      />
    );
    // First child should be an empty spacer div
    const grid = container.firstChild as HTMLElement;
    expect(grid.children.length).toBe(4); // spacer + 2 columns + actions spacer
  });

  it('should not render expand spacer when isExpandable is false', () => {
    const { container } = render(
      <LogsTableHeader
        resolvedColumns={defaultColumns}
        gridTemplateColumns="190px 1fr min-content"
        isExpandable={false}
        actionCount={0}
        sortState={null}
        onSortClick={jest.fn()}
      />
    );
    const grid = container.firstChild as HTMLElement;
    expect(grid.children.length).toBe(3); // 2 columns + actions spacer
  });
});
