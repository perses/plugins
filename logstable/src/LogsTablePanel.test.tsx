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

import { ChartsProvider, SnackbarProvider, testChartsTheme } from '@perses-dev/components';
import { render, screen, fireEvent } from '@testing-library/react';
import { MOCK_LOGS_QUERY_RESULT, MOCK_LOGS_QUERY_DEFINITION, MOCK_LOGS_QUERY_RESULTS } from './test/mock-query-results';
import { LogsTablePanel } from './LogsTablePanel';
import { LogsQueryData, LogsTableProps } from './model';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

const TEST_LOGS_TABLE_PROPS: Omit<LogsTableProps, 'queryResults'> = {
  contentDimensions: {
    width: 500,
    height: 500,
  },
  spec: {
    showAll: true,
  },
};

describe('LogsTablePanel', () => {
  // Helper to render the panel with some context set
  const renderPanel = (data: LogsQueryData | LogsQueryData[]): void => {
    render(
      <SnackbarProvider>
        <ChartsProvider chartsTheme={testChartsTheme}>
          <LogsTablePanel
            {...TEST_LOGS_TABLE_PROPS}
            queryResults={
              !Array.isArray(data)
                ? [{ definition: MOCK_LOGS_QUERY_DEFINITION, data }]
                : data.map((d) => ({ definition: MOCK_LOGS_QUERY_DEFINITION, data: d }))
            }
          />
        </ChartsProvider>
      </SnackbarProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render multi values with timestamps', async () => {
    renderPanel(MOCK_LOGS_QUERY_RESULT);
    const items = screen.getByTestId('virtuoso-item-list');

    expect(await items.querySelectorAll('div[data-index]')).toHaveLength(2); // 2 lines
    expect(await screen.findAllByText('2022-10-24T15:31:30.000Z')).toHaveLength(1); // first timestamp appear once per line
    expect(await screen.findAllByText('2022-10-24T15:31:31.000Z')).toHaveLength(1); // second timestamp appear once per line
  });

  it('should include results from multiple queries', async () => {
    renderPanel(MOCK_LOGS_QUERY_RESULTS);
    const items = screen.getAllByTestId(/^log-row-container-/);
    expect(items.length).toBe(2);
  });

  it('should select multiple rows with Cmd+Click', () => {
    renderPanel(MOCK_LOGS_QUERY_RESULT);
    const items = screen.getByTestId('virtuoso-item-list');
    const firstRow = items.querySelector('[data-log-index="0"] > div')!;
    const secondRow = items.querySelector('[data-log-index="1"] > div')!;

    // Get computed background before selection
    const firstRowInitialBg = window.getComputedStyle(firstRow).backgroundColor;

    // Cmd+Click first row
    fireEvent.mouseDown(firstRow, { metaKey: true });

    // Background should change (selected state)
    const firstRowSelectedBg = window.getComputedStyle(firstRow).backgroundColor;
    expect(firstRowSelectedBg).not.toBe(firstRowInitialBg);

    // Cmd+Click second row
    fireEvent.mouseDown(secondRow, { metaKey: true });

    // Both should still be selected
    expect(window.getComputedStyle(firstRow).backgroundColor).toBe(firstRowSelectedBg);
    expect(window.getComputedStyle(secondRow).backgroundColor).toBe(firstRowSelectedBg);
  });

  it('should copy multiple selected rows with Cmd+C', () => {
    renderPanel(MOCK_LOGS_QUERY_RESULT);
    const items = screen.getByTestId('virtuoso-item-list');
    const firstRow = items.querySelector('[data-log-index="0"] > div')!;
    const secondRow = items.querySelector('[data-log-index="1"] > div')!;

    // Select both rows
    fireEvent.mouseDown(firstRow, { metaKey: true });
    fireEvent.mouseDown(secondRow, { metaKey: true });

    // Copy with onCopy event
    const virtuosoScroller = screen.getByTestId('virtuoso-scroller');
    const mockClipboardData = {
      setData: jest.fn(),
    };
    fireEvent.copy(virtuosoScroller, { clipboardData: mockClipboardData });

    // Should have copied both logs
    expect(mockClipboardData.setData).toHaveBeenCalledWith('text/plain', expect.stringMatching(/foo.*bar/s));
  });
});
