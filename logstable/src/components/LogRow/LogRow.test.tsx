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
import { LogEntry } from '@perses-dev/spec';
import { ResolvedColumn } from '../column-resolution';
import { LogRow } from './LogRow';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

const defaultResolvedColumns: ResolvedColumn[] = [
  {
    name: 'timestamp',
    header: 'Timestamp',
    type: 'timestamp',
    enableSorting: true,
    sortMode: 'timestamp',
    allowWrap: false,
  },
  { name: 'line', header: 'Log line', type: 'line', enableSorting: false, sortMode: 'alphabetical', allowWrap: false },
];

const defaultGridTemplate = '16px 190px 1fr min-content';

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
        resolvedColumns={defaultResolvedColumns}
        gridTemplateColumns={defaultGridTemplate}
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

  describe('ANSI rendering', () => {
    it('should render ANSI colored log text as HTML', () => {
      const ansiLog: LogEntry = {
        timestamp: 1767225600,
        line: '\x1b[31mERROR\x1b[0m connection refused',
        labels: { level: 'error' },
      };
      render(
        <LogRow
          log={ansiLog}
          index={0}
          isExpanded={false}
          onToggle={jest.fn()}
          resolvedColumns={defaultResolvedColumns}
          gridTemplateColumns={defaultGridTemplate}
        />
      );
      const errorSpan = document.querySelector('.ansi-red-fg');
      expect(errorSpan).toBeInTheDocument();
      expect(errorSpan).toHaveTextContent('ERROR');
    });

    it('should render plain log text without dangerouslySetInnerHTML', () => {
      renderLogRow(); // uses existing mockLog with plain text 'foo bar baz'
      expect(screen.getByText('foo bar baz')).toBeInTheDocument();
      expect(document.querySelector('[class*="ansi-"]')).toBeNull();
    });
  });

  describe('dynamic columns', () => {
    it('should render label column cells', () => {
      const columnsWithLabel: ResolvedColumn[] = [
        {
          name: 'region',
          header: 'Region',
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
          allowWrap: false,
        },
      ];
      render(
        <LogRow
          log={mockLog}
          index={0}
          isExpanded={false}
          onToggle={jest.fn()}
          resolvedColumns={columnsWithLabel}
          gridTemplateColumns="16px 150px 1fr min-content"
        />
      );
      // 'bar' is the value of the region label, and also appears in the log line.
      // Use getAllByText to confirm at least one element renders the label value.
      const elements = screen.getAllByText((content, element) => {
        return element?.tagName === 'SPAN' && content === 'bar';
      });
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });

    it('should render em-dash for missing label values', () => {
      const columnsWithMissingLabel: ResolvedColumn[] = [
        {
          name: 'nonexistent',
          header: 'Missing',
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
          allowWrap: false,
        },
      ];
      render(
        <LogRow
          log={mockLog}
          index={0}
          isExpanded={false}
          onToggle={jest.fn()}
          resolvedColumns={columnsWithMissingLabel}
          gridTemplateColumns="16px 150px 1fr min-content"
        />
      );
      expect(screen.getByText('—')).toBeInTheDocument();
    });

    it('should render timestamp column', () => {
      render(
        <LogRow
          log={mockLog}
          index={0}
          isExpanded={false}
          onToggle={jest.fn()}
          resolvedColumns={defaultResolvedColumns}
          gridTemplateColumns={defaultGridTemplate}
        />
      );
      // LogTimestamp renders a <time> element
      expect(document.querySelector('time')).toBeInTheDocument();
    });
  });

  describe('expanded details panel', () => {
    it('should render LogDetailsTable when expanded', () => {
      render(
        <LogRow
          log={mockLog}
          index={0}
          isExpanded={true}
          onToggle={jest.fn()}
          resolvedColumns={defaultResolvedColumns}
          gridTemplateColumns={defaultGridTemplate}
        />
      );
      // LogDetailsTable renders label keys as table cells
      expect(screen.getByText('level')).toBeInTheDocument();
      expect(screen.getByText('service')).toBeInTheDocument();
    });
  });
});
