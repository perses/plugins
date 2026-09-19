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

import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';

import type { BaseColumnDefinition } from './ColumnsEditor';
import { ColumnsEditor } from './ColumnsEditor';

const SORT_MODES = { alphabetical: 'Alphabetical' };
const INITIAL_COLUMNS = [{ name: 'first' }, { name: 'second' }];
const getName = (column: BaseColumnDefinition): string => column.name;
const renderName = (column: BaseColumnDefinition): ReactElement => (
  <input aria-label="Column name" defaultValue={column.name} />
);
const onUpdate = vi.fn();

function Editor(): ReactElement {
  const [columns, setColumns] = useState(INITIAL_COLUMNS);
  const onAdd = useCallback((): void => setColumns((previous) => [...previous, { name: 'added' }]), []);
  const onRemove = useCallback(
    (index: number): void => setColumns((previous) => previous.filter((_, i) => i !== index)),
    [],
  );
  const move = useCallback((index: number, offset: number): void => {
    setColumns((previous) => {
      const next = [...previous];
      const [column] = next.splice(index, 1);
      if (column) next.splice(index + offset, 0, column);
      return next;
    });
  }, []);
  const onMoveUp = useCallback((index: number): void => move(index, -1), [move]);
  const onMoveDown = useCallback((index: number): void => move(index, 1), [move]);

  return (
    <ColumnsEditor
      columns={columns}
      description="Columns"
      sortModeLabels={SORT_MODES}
      defaultSortMode="alphabetical"
      getDisplayName={getName}
      getHeaderPlaceholder={getName}
      onAdd={onAdd}
      onRemove={onRemove}
      onUpdate={onUpdate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      renderNameField={renderName}
    />
  );
}

describe('ColumnsEditor', () => {
  it('keeps local edits with their column when moving, removing, and adding columns', () => {
    render(<Editor />);
    const firstInput = screen.getAllByRole('textbox', { name: 'Column name' })[0]!;
    fireEvent.change(firstInput, { target: { value: 'draft' } });

    fireEvent.click(screen.getAllByRole('button', { name: 'Move column down' })[0]!);
    expect(screen.getAllByRole('textbox', { name: 'Column name' })[1]).toBe(firstInput);
    expect(firstInput).toHaveValue('draft');

    fireEvent.click(screen.getAllByRole('button', { name: 'Move column up' })[1]!);
    expect(screen.getAllByRole('textbox', { name: 'Column name' })[0]).toBe(firstInput);

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove column' })[1]!);
    fireEvent.click(screen.getByRole('button', { name: 'Add column' }));
    expect(screen.getAllByRole('textbox', { name: 'Column name' })[0]).toBe(firstInput);
    expect(firstInput).toHaveValue('draft');
    expect(screen.getAllByRole('textbox', { name: 'Column name' })[1]).toHaveValue('added');
  });
});
