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
import { describe, expect, it, vi } from 'vitest';

import { MarkdownPanelOptionsEditor } from './MarkdownPanelOptionsEditor';

describe('MarkdownPanelOptionsEditor', () => {
  it('shows HTML rendering as disabled by default', () => {
    render(<MarkdownPanelOptionsEditor value={{ text: 'hello' }} onChange={vi.fn()} />);
    expect(screen.getByRole('checkbox', { name: /Enable HTML/i })).not.toBeChecked();
  });

  it('enables HTML rendering while keeping the text', () => {
    const onChange = vi.fn();
    render(<MarkdownPanelOptionsEditor value={{ text: 'hello' }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Enable HTML/i }));
    expect(onChange).toHaveBeenCalledWith({ text: 'hello', enableHtml: true });
  });

  it('keeps enableHtml when the text changes', () => {
    const onChange = vi.fn();
    render(<MarkdownPanelOptionsEditor value={{ text: 'hello', enableHtml: true }} onChange={onChange} />);
    fireEvent.change(screen.getByRole('textbox', { name: /Text/i }), { target: { value: 'world' } });
    expect(onChange).toHaveBeenCalledWith({ text: 'world', enableHtml: true });
  });
});
