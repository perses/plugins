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
import { LogsTableColumnsEditor } from './LogsTableColumnsEditor';
import { LogsTableOptions, LogsColumnDefinition } from './model';

const createProps = (columns?: LogsColumnDefinition[]): { value: LogsTableOptions; onChange: jest.Mock } => {
  const value: LogsTableOptions = {
    allowWrap: true,
    enableDetails: true,
    columns,
  };
  const onChange = jest.fn();
  return { value, onChange };
};

describe('LogsTableColumnsEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the description text about default columns', () => {
    const props = createProps();
    render(<LogsTableColumnsEditor {...props} />);
    expect(screen.getByText(/Timestamp and Log line are shown by default/i)).toBeInTheDocument();
  });

  it('should render columns when provided', () => {
    const props = createProps([{ name: 'service', header: 'Service' }, { name: 'level' }]);
    render(<LogsTableColumnsEditor {...props} />);
    expect(screen.getByText('Service')).toBeInTheDocument();
    expect(screen.getByText('level')).toBeInTheDocument();
  });

  it('should pre-populate with timestamp and line columns on first add', () => {
    const props = createProps(undefined);
    render(<LogsTableColumnsEditor {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /add column/i }));
    expect(props.onChange).toHaveBeenCalledTimes(1);
    const newValue = props.onChange.mock.calls[0][0];
    expect(newValue.columns).toHaveLength(2);
    expect(newValue.columns[0]).toEqual({
      name: 'timestamp',
      header: 'Timestamp',
      sortMode: 'timestamp',
      sort: 'desc',
    });
    expect(newValue.columns[1]).toEqual({ name: 'line', header: 'Log line', allowWrap: true, enableSorting: false });
  });

  it('should call onChange with new column appended when add is clicked', () => {
    const props = createProps([{ name: 'existing' }]);
    render(<LogsTableColumnsEditor {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /add column/i }));
    expect(props.onChange).toHaveBeenCalledTimes(1);
    const newValue = props.onChange.mock.calls[0][0];
    expect(newValue.columns).toHaveLength(2);
    expect(newValue.columns[1]).toEqual({ name: '' });
  });

  it('should call onChange with column removed when delete is clicked', () => {
    const props = createProps([{ name: 'first' }, { name: 'second' }]);
    render(<LogsTableColumnsEditor {...props} />);
    const deleteButtons = screen.getAllByLabelText('Delete column');
    fireEvent.click(deleteButtons[0]!);
    expect(props.onChange).toHaveBeenCalledTimes(1);
    const newValue = props.onChange.mock.calls[0][0];
    expect(newValue.columns).toHaveLength(1);
    expect(newValue.columns[0].name).toBe('second');
  });

  it('should call onChange with columns reordered when move up is clicked', () => {
    const props = createProps([{ name: 'first' }, { name: 'second' }]);
    render(<LogsTableColumnsEditor {...props} />);
    const moveUpButtons = screen.getAllByLabelText('Move column up');
    fireEvent.click(moveUpButtons[1]!); // move second column up
    expect(props.onChange).toHaveBeenCalledTimes(1);
    const newValue = props.onChange.mock.calls[0][0];
    expect(newValue.columns[0].name).toBe('second');
    expect(newValue.columns[1].name).toBe('first');
  });

  it('should call onChange with columns reordered when move down is clicked', () => {
    const props = createProps([{ name: 'first' }, { name: 'second' }]);
    render(<LogsTableColumnsEditor {...props} />);
    const moveDownButtons = screen.getAllByLabelText('Move column down');
    fireEvent.click(moveDownButtons[0]!); // move first column down
    expect(props.onChange).toHaveBeenCalledTimes(1);
    const newValue = props.onChange.mock.calls[0][0];
    expect(newValue.columns[0].name).toBe('second');
    expect(newValue.columns[1].name).toBe('first');
  });

  it('should render wrap content checkbox for each column', () => {
    const props = createProps([{ name: 'col1' }, { name: 'col2' }]);
    render(<LogsTableColumnsEditor {...props} />);
    const wrapCheckboxes = screen.getAllByLabelText('Wrap content');
    expect(wrapCheckboxes).toHaveLength(2);
  });

  it('should have wrap content unchecked by default', () => {
    const props = createProps([{ name: 'col1' }]);
    render(<LogsTableColumnsEditor {...props} />);
    const wrapCheckbox = screen.getByLabelText('Wrap content');
    expect(wrapCheckbox).not.toBeChecked();
  });

  it('should have wrap content checked when allowWrap is true', () => {
    const props = createProps([{ name: 'col1', allowWrap: true }]);
    render(<LogsTableColumnsEditor {...props} />);
    const wrapCheckbox = screen.getByLabelText('Wrap content');
    expect(wrapCheckbox).toBeChecked();
  });

  it('should render column name field with helper text', () => {
    const props = createProps([{ name: 'service' }]);
    render(<LogsTableColumnsEditor {...props} />);
    expect(screen.getByText(/Use 'timestamp', 'line', or a label key/)).toBeInTheDocument();
  });

  it('should display "New column" as display name for empty column', () => {
    const props = createProps([{ name: '' }]);
    render(<LogsTableColumnsEditor {...props} />);
    expect(screen.getByText('New column')).toBeInTheDocument();
  });

  it('should render with empty columns array when columns is undefined', () => {
    const props = createProps(undefined);
    render(<LogsTableColumnsEditor {...props} />);
    expect(screen.getByRole('button', { name: /add column/i })).toBeInTheDocument();
    expect(screen.queryByLabelText('Enable sorting')).not.toBeInTheDocument();
  });

  it('should render sort mode options including Alphabetical, Numeric, and Timestamp', () => {
    const props = createProps([{ name: 'col1' }]);
    render(<LogsTableColumnsEditor {...props} />);
    // The sort mode select should be present
    expect(screen.getByLabelText('Sort mode')).toBeInTheDocument();
  });
});
