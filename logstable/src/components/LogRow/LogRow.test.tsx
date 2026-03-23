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

import { render, screen, waitFor, fireEvent, RenderResult } from '@testing-library/react';
import { LogEntry } from '@perses-dev/core';
import { LogRow } from './LogRow';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

describe('LogRow', () => {
  const mockLog: LogEntry = {
    timestamp: 1767225600,
    line: 'foo bar baz',
    labels: { level: 'info', service: 'foo', region: 'bar' },
  };

  const renderLogRow = ({ onSelect = jest.fn(), isSelected = false } = {}): RenderResult => {
    return render(
      <LogRow
        log={mockLog}
        index={0}
        isExpanded={false}
        onToggle={jest.fn()}
        isSelected={isSelected}
        onSelect={onSelect}
      />
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render log message', () => {
    renderLogRow();
    expect(screen.getByText('foo bar baz')).toBeInTheDocument();
  });

  it('should show copy button', () => {
    renderLogRow();
    expect(screen.getByLabelText(/Copy log/i)).toBeInTheDocument();
  });

  describe('copy formats', () => {
    const openCopyMenu = async (): Promise<{ container: HTMLElement }> => {
      const { container } = renderLogRow();
      const row = container.querySelector('[data-log-index="0"]')!;

      fireEvent.mouseEnter(row);
      const copyButton = await screen.findByLabelText(/Copy log/i);
      fireEvent.click(copyButton);

      return { container };
    };

    it('should copy log in Full format', async () => {
      await openCopyMenu();

      const formatOption = await screen.findByText(/^Copy log$/i);
      fireEvent.click(formatOption);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('level="info"'));
      });
    });

    it('should copy log in Message format', async () => {
      await openCopyMenu();

      const formatOption = await screen.findByText(/^Copy message$/i);
      fireEvent.click(formatOption);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('foo bar baz');
      });
    });

    it('should copy log in JSON format', async () => {
      await openCopyMenu();

      const formatOption = await screen.findByText(/^Copy as JSON$/i);
      fireEvent.click(formatOption);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('"timestamp"'));
      });
    });
  });

  it('should show success checkmark after copying', async () => {
    const { container } = renderLogRow();
    const row = container.querySelector('[data-log-index="0"]')!;

    fireEvent.mouseEnter(row);
    const copyButton = await screen.findByLabelText(/Copy log/i);
    fireEvent.click(copyButton);

    const messageOption = await screen.findByText(/^Copy message$/i);
    fireEvent.click(messageOption);

    await waitFor(() => {
      expect(screen.getByTestId('CheckIcon')).toBeInTheDocument();
    });
  });

  it('should handle selection click', () => {
    const onSelect = jest.fn();
    const { container } = renderLogRow({ onSelect });
    const content = container.querySelector('[data-log-index="0"] > div')!;

    fireEvent.mouseDown(content);

    expect(onSelect).toHaveBeenCalledWith(0, expect.objectContaining({ type: 'mousedown' }));
  });
});
