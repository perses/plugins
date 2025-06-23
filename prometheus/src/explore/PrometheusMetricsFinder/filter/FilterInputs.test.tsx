// Copyright 2024 The Perses Authors
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

import { act, fireEvent, render, screen } from '@testing-library/react';
import { RawFilterInput, RawFilterInputProps } from './FilterInputs';

describe('FilterInputs', () => {
  const renderInputs = ({
    value = { label: '', labelValues: [], operator: '=~' },
    labelOptions,
    labelValuesOptions,
    isLabelOptionsLoading,
    isLabelValuesOptionsLoading,
    onChange = (): void => {},
    onDelete = (): void => {},
  }: Partial<RawFilterInputProps>): void => {
    render(
      <RawFilterInput
        value={value}
        labelOptions={labelOptions}
        labelValuesOptions={labelValuesOptions}
        isLabelOptionsLoading={isLabelOptionsLoading}
        isLabelValuesOptionsLoading={isLabelValuesOptionsLoading}
        onChange={onChange}
        onDelete={onDelete}
      />
    );
  };

  it('should set the label name and label value', async () => {
    const onChange = jest.fn();
    renderInputs({ onChange });

    const nameInput = screen.getByRole('combobox', { name: 'Label Name' });
    expect(nameInput).toBeInTheDocument();
    act(() => {
      fireEvent.change(nameInput, { target: { value: 'Test' } });
    });

    expect(onChange).toHaveBeenCalledWith({ label: 'Test', labelValues: [], operator: '=~' });

    const valueInput = screen.getByRole('combobox', { name: 'Label Values' });
    expect(valueInput).toBeInTheDocument();
    act(() => {
      fireEvent.change(valueInput, { target: { value: 'test1' } });
      fireEvent.keyDown(valueInput, { key: 'Enter', code: 'Enter', charCode: 13 });
    });

    // empty label because onChange is mocked, previous changes is not applied
    expect(onChange).toHaveBeenCalledWith({ label: '', labelValues: ['test1'], operator: '=~' });
  });
});
