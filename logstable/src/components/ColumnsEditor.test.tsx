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
import { ReactElement } from 'react';
import { ColumnsEditor, ColumnsEditorProps, BaseColumnDefinition } from './ColumnsEditor';

interface TestColumn extends BaseColumnDefinition {
  customField?: string;
}

const defaultProps = (overrides: Partial<ColumnsEditorProps<TestColumn>> = {}): ColumnsEditorProps<TestColumn> => ({
  columns: [],
  description: 'Test description text',
  sortModeLabels: { alpha: 'Alphabetical', num: 'Numeric' },
  defaultSortMode: 'alpha',
  getDisplayName: (col) => col.header || col.name || 'Unnamed',
  getHeaderPlaceholder: (col) => col.name || 'Column header',
  onAdd: jest.fn(),
  onRemove: jest.fn(),
  onUpdate: jest.fn(),
  onMoveUp: jest.fn(),
  onMoveDown: jest.fn(),
  renderNameField: (col, index, _onUpdate) => (
    <input data-testid={`name-field-${index}`} value={col.name} onChange={() => {}} />
  ),
  ...overrides,
});

const sampleColumns: TestColumn[] = [
  { name: 'col1', header: 'Column One', enableSorting: true, sortMode: 'alpha' },
  { name: 'col2', header: 'Column Two' },
];

describe('ColumnsEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render description text', () => {
    render(<ColumnsEditor {...defaultProps()} />);
    expect(screen.getByText('Test description text')).toBeInTheDocument();
  });

  it('should render "Columns" group title', () => {
    render(<ColumnsEditor {...defaultProps()} />);
    expect(screen.getByText('Columns')).toBeInTheDocument();
  });

  it('should render add column button', () => {
    render(<ColumnsEditor {...defaultProps()} />);
    expect(screen.getByRole('button', { name: /add column/i })).toBeInTheDocument();
  });

  it('should call onAdd when add column button is clicked', () => {
    const onAdd = jest.fn();
    render(<ColumnsEditor {...defaultProps({ onAdd })} />);
    fireEvent.click(screen.getByRole('button', { name: /add column/i }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('should render column display names', () => {
    render(<ColumnsEditor {...defaultProps({ columns: sampleColumns })} />);
    expect(screen.getByText('Column One')).toBeInTheDocument();
    expect(screen.getByText('Column Two')).toBeInTheDocument();
  });

  it('should render name field for each column via renderNameField', () => {
    render(<ColumnsEditor {...defaultProps({ columns: sampleColumns })} />);
    expect(screen.getByTestId('name-field-0')).toBeInTheDocument();
    expect(screen.getByTestId('name-field-1')).toBeInTheDocument();
  });

  it('should render header text field for each column', () => {
    render(<ColumnsEditor {...defaultProps({ columns: sampleColumns })} />);
    const headerInputs = screen.getAllByLabelText('Header');
    expect(headerInputs).toHaveLength(2);
  });

  it('should render enable sorting checkbox for each column', () => {
    render(<ColumnsEditor {...defaultProps({ columns: sampleColumns })} />);
    const checkboxes = screen.getAllByLabelText('Enable sorting');
    expect(checkboxes).toHaveLength(2);
  });

  it('should have enable sorting checked by default (when enableSorting is undefined)', () => {
    const cols: TestColumn[] = [{ name: 'test' }]; // enableSorting is undefined => default true
    render(<ColumnsEditor {...defaultProps({ columns: cols })} />);
    const checkbox = screen.getByLabelText('Enable sorting');
    expect(checkbox).toBeChecked();
  });

  it('should have enable sorting unchecked when enableSorting is false', () => {
    const cols: TestColumn[] = [{ name: 'test', enableSorting: false }];
    render(<ColumnsEditor {...defaultProps({ columns: cols })} />);
    const checkbox = screen.getByLabelText('Enable sorting');
    expect(checkbox).not.toBeChecked();
  });

  it('should render sort mode select for each column', () => {
    render(<ColumnsEditor {...defaultProps({ columns: sampleColumns })} />);
    const sortModeSelects = screen.getAllByLabelText('Sort mode');
    expect(sortModeSelects).toHaveLength(2);
  });

  it('should render default sort select for each column', () => {
    render(<ColumnsEditor {...defaultProps({ columns: sampleColumns })} />);
    const defaultSortSelects = screen.getAllByLabelText('Default sort');
    expect(defaultSortSelects).toHaveLength(2);
  });

  it('should call onRemove with correct index when delete button is clicked', () => {
    const onRemove = jest.fn();
    render(<ColumnsEditor {...defaultProps({ columns: sampleColumns, onRemove })} />);
    const deleteButtons = screen.getAllByLabelText('Delete column');
    fireEvent.click(deleteButtons[1]!);
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it('should call onMoveUp with correct index when move up button is clicked', () => {
    const onMoveUp = jest.fn();
    render(<ColumnsEditor {...defaultProps({ columns: sampleColumns, onMoveUp })} />);
    const moveUpButtons = screen.getAllByLabelText('Move column up');
    fireEvent.click(moveUpButtons[1]!);
    expect(onMoveUp).toHaveBeenCalledWith(1);
  });

  it('should call onMoveDown with correct index when move down button is clicked', () => {
    const onMoveDown = jest.fn();
    render(<ColumnsEditor {...defaultProps({ columns: sampleColumns, onMoveDown })} />);
    const moveDownButtons = screen.getAllByLabelText('Move column down');
    fireEvent.click(moveDownButtons[0]!);
    expect(onMoveDown).toHaveBeenCalledWith(0);
  });

  it('should call onUpdate when header text field changes', () => {
    const onUpdate = jest.fn();
    render(<ColumnsEditor {...defaultProps({ columns: sampleColumns, onUpdate })} />);
    const headerInputs = screen.getAllByLabelText('Header');
    fireEvent.change(headerInputs[0]!, { target: { value: 'New Header' } });
    expect(onUpdate).toHaveBeenCalledWith(0, expect.any(Function));
  });

  it('should call onUpdate when enable sorting checkbox changes', () => {
    const onUpdate = jest.fn();
    render(<ColumnsEditor {...defaultProps({ columns: sampleColumns, onUpdate })} />);
    const checkboxes = screen.getAllByLabelText('Enable sorting');
    fireEvent.click(checkboxes[0]!);
    expect(onUpdate).toHaveBeenCalledWith(0, expect.any(Function));
  });

  it('should render extra fields when renderExtraFields is provided', () => {
    const renderExtraFields = (col: TestColumn, index: number): ReactElement => (
      <div data-testid={`extra-field-${index}`}>Extra for {col.name}</div>
    );
    render(<ColumnsEditor {...defaultProps({ columns: sampleColumns, renderExtraFields })} />);
    expect(screen.getByTestId('extra-field-0')).toBeInTheDocument();
    expect(screen.getByTestId('extra-field-1')).toBeInTheDocument();
    expect(screen.getByText('Extra for col1')).toBeInTheDocument();
  });

  it('should not render extra fields section when renderExtraFields is not provided', () => {
    render(<ColumnsEditor {...defaultProps({ columns: sampleColumns })} />);
    expect(screen.queryByTestId('extra-field-0')).not.toBeInTheDocument();
  });

  it('should render empty state with only description and add button when no columns', () => {
    render(<ColumnsEditor {...defaultProps()} />);
    expect(screen.getByText('Test description text')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add column/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Enable sorting')).not.toBeInTheDocument();
  });
});
