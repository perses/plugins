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

import { LazyTextField } from './LazyTextField';

describe('LazyTextField', () => {
  it('preserves an uncommitted draft across renders and commits it on blur', () => {
    const onCommit = vi.fn();
    const { rerender } = render(<LazyTextField label="Matcher" value="initial" onCommit={onCommit} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'draft' } });
    rerender(<LazyTextField label="Matcher" value="initial" onCommit={onCommit} />);

    expect(screen.getByRole('textbox')).toHaveValue('draft');
    expect(onCommit).not.toHaveBeenCalled();
    fireEvent.blur(screen.getByRole('textbox'));
    expect(onCommit).toHaveBeenCalledWith('draft');
  });

  it('resets a draft when the committed value changes or is cleared', () => {
    const onCommit = vi.fn();
    const { rerender } = render(<LazyTextField label="Matcher" value="initial" onCommit={onCommit} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'draft' } });
    rerender(<LazyTextField label="Matcher" value="updated" onCommit={onCommit} />);
    expect(screen.getByRole('textbox')).toHaveValue('updated');

    rerender(<LazyTextField label="Matcher" onCommit={onCommit} />);
    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(onCommit).not.toHaveBeenCalled();
  });
});
