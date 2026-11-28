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

import { fireEvent, render, screen, within } from '@testing-library/react';

import { ClickHouseTraceQueryEditor } from './ClickHouseTraceQueryEditor';

vi.mock('@perses-dev/plugin-system', () => ({
  DatasourceSelect: vi.fn(() => null),
  isVariableDatasource: vi.fn(() => false),
}));

vi.mock('@perses-dev/dashboards', () => ({
  createModEnterHandler: vi.fn(() => vi.fn()),
}));

vi.mock('../../components', () => ({
  ClickQLEditor: vi.fn(() => null),
}));

describe('ClickHouseTraceQueryEditor', () => {
  it('commits the trace table on blur instead of each keystroke', () => {
    const onChange = vi.fn();
    render(<ClickHouseTraceQueryEditor value={{ query: 'SELECT 1' }} onChange={onChange} />);

    const tableInput = screen.getByLabelText('Trace table');
    fireEvent.change(tableInput, { target: { value: ' otel.otel_traces ' } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.blur(tableInput);
    expect(onChange).toHaveBeenCalledWith({ query: 'SELECT 1', table: 'otel.otel_traces' });
  });

  it('removes the trace table from the spec when it is cleared', () => {
    const onChange = vi.fn();
    render(<ClickHouseTraceQueryEditor value={{ query: 'SELECT 1', table: 'otel.otel_traces' }} onChange={onChange} />);

    const tableInput = screen.getByLabelText('Trace table');
    fireEvent.change(tableInput, { target: { value: '' } });
    fireEvent.blur(tableInput);

    const nextSpec = onChange.mock.calls[0]?.[0];
    expect(nextSpec).toEqual({ query: 'SELECT 1' });
    expect(nextSpec.table).toBeUndefined();
  });

  it('updates the search limit', () => {
    const onChange = vi.fn();
    render(<ClickHouseTraceQueryEditor value={{ query: 'SELECT 1' }} onChange={onChange} />);

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Max traces' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: '50' }));

    expect(onChange).toHaveBeenCalledWith({ query: 'SELECT 1', limit: 50 });
  });

  it('keeps a limit that is not one of the preset options selectable', () => {
    render(<ClickHouseTraceQueryEditor value={{ query: 'SELECT 1', limit: 30 }} onChange={vi.fn()} />);

    expect(screen.getByRole('combobox', { name: 'Max traces' })).toHaveTextContent('30');
  });
});
