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

import { ChartsProvider, SelectionProvider, SnackbarProvider, testChartsTheme } from '@perses-dev/components';
import { TimeSeriesData } from '@perses-dev/core';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import {
  MOCK_TIME_SERIES_DATA_MULTIVALUE,
  MOCK_TIME_SERIES_DATA_SINGLEVALUE,
  MOCK_TIME_SERIES_QUERY_DEFINITION,
} from './test/mock-query-results';
import { TimeSeriesTablePanel, TimeSeriesTableProps } from './TimeSeriesTablePanel';
import { TimeSeriesTableOptions } from './model';

const TEST_TIME_SERIES_TABLE_PROPS: Omit<TimeSeriesTableProps, 'queryResults'> = {
  contentDimensions: {
    width: 500,
    height: 500,
  },
  spec: {},
};

describe('TimeSeriesTablePanel', () => {
  // Helper to render the panel with some context set
  const renderPanel = (data: TimeSeriesData, options?: TimeSeriesTableOptions): void => {
    render(
      <SnackbarProvider>
        <SelectionProvider>
          <ChartsProvider chartsTheme={testChartsTheme}>
            <TimeSeriesTablePanel
              {...TEST_TIME_SERIES_TABLE_PROPS}
              spec={options ?? {}}
              queryResults={[{ definition: MOCK_TIME_SERIES_QUERY_DEFINITION, data }]}
            />
          </ChartsProvider>
        </SelectionProvider>
      </SnackbarProvider>
    );
  };

  it('should render multi values with timestamps', async () => {
    renderPanel(MOCK_TIME_SERIES_DATA_MULTIVALUE);

    expect(
      screen.getAllByText(
        (_, element) =>
          element?.textContent ===
          '{device="/dev/vda1", env="demo", fstype="ext4", instance="demo.do.prometheus.io:9100", job="node", mountpoint="/"}'
      ).length
    ).toBeGreaterThan(0);

    expect(await screen.findAllByRole('cell')).toHaveLength(4); // 2 lines with 2 column
    expect(await screen.findAllByText('@1666479357903')).toHaveLength(2); // first timestamp appear once per line
    expect(await screen.findAllByText('@1666479382282')).toHaveLength(2); // second timestamp appear once per line
  });

  it('should render single value without timestamp', async () => {
    renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE);

    expect(
      screen.getAllByText(
        (_, element) =>
          element?.textContent ===
          '{device="/dev/vda1", env="demo", fstype="ext4", instance="demo.do.prometheus.io:9100", job="node", mountpoint="/"}'
      ).length
    ).toBeGreaterThan(0);

    expect(await screen.findAllByRole('cell')).toHaveLength(4); // 2 lines with 2 column
    expect(screen.queryByText('@')).toBeNull(); // No @ as no timestamp
  });

  describe('Selection', () => {
    it('should not render checkboxes when selection is disabled', async () => {
      renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, { selection: { enabled: false } });

      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });

    it('should render checkboxes when selection is enabled', async () => {
      renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, { selection: { enabled: true } });

      // Should have select-all checkbox + 2 row checkboxes
      const checkboxes = await screen.findAllByRole('checkbox');
      expect(checkboxes).toHaveLength(3); // 1 header checkbox + 2 row checkboxes
    });

    it('should render table header with column labels when selection is enabled', async () => {
      renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, { selection: { enabled: true } });

      expect(await screen.findByRole('columnheader', { name: /Series/i })).toBeInTheDocument();
      expect(await screen.findByRole('columnheader', { name: /Value/i })).toBeInTheDocument();
    });

    it('should toggle row selection when clicking checkbox', async () => {
      renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, { selection: { enabled: true } });

      const checkboxes = await screen.findAllByRole('checkbox');
      const rowCheckbox = checkboxes[1]!; // First row checkbox (index 0 is select-all)

      // Initially unchecked
      expect(rowCheckbox).not.toBeChecked();

      // Click to select
      userEvent.click(rowCheckbox);
      expect(rowCheckbox).toBeChecked();

      // Click again to deselect
      userEvent.click(rowCheckbox);
      expect(rowCheckbox).not.toBeChecked();
    });

    it('should select all rows when clicking header checkbox', async () => {
      renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, { selection: { enabled: true } });

      const checkboxes = await screen.findAllByRole('checkbox');
      const selectAllCheckbox = checkboxes[0]!;
      const rowCheckbox1 = checkboxes[1]!;
      const rowCheckbox2 = checkboxes[2]!;

      // Initially all unchecked
      expect(selectAllCheckbox).not.toBeChecked();
      expect(rowCheckbox1).not.toBeChecked();
      expect(rowCheckbox2).not.toBeChecked();

      // Click select-all
      await userEvent.click(selectAllCheckbox);

      // All should be checked
      expect(selectAllCheckbox).toBeChecked();
      expect(rowCheckbox1).toBeChecked();
      expect(rowCheckbox2).toBeChecked();
    });

    it('should deselect all rows when clicking header checkbox while all selected', async () => {
      renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, { selection: { enabled: true } });

      const checkboxes = await screen.findAllByRole('checkbox');
      const selectAllCheckbox = checkboxes[0]!;

      // Select all
      userEvent.click(selectAllCheckbox);
      expect(selectAllCheckbox).toBeChecked();

      // Deselect all
      userEvent.click(selectAllCheckbox);
      expect(selectAllCheckbox).not.toBeChecked();

      // All row checkboxes should be unchecked
      const updatedCheckboxes = await screen.findAllByRole('checkbox');
      expect(updatedCheckboxes[1]).not.toBeChecked();
      expect(updatedCheckboxes[2]).not.toBeChecked();
    });
  });

  describe('Item Actions', () => {
    it('should not render actions column when actions are disabled', async () => {
      renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, {
        selection: { enabled: true },
        actions: { enabled: false },
      });

      expect(screen.queryByRole('columnheader', { name: /Actions/i })).not.toBeInTheDocument();
    });

    it('should render actions column when actions are enabled with displayWithItem', async () => {
      renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, {
        selection: { enabled: true },
        actions: {
          enabled: true,
          displayWithItem: true,
          actionsList: [
            {
              type: 'webhook',
              name: 'Test Action',
              url: 'https://example.com/action',
              method: 'POST',
              contentType: 'json',
              batchMode: 'individual',
            },
          ],
        },
      });

      expect(await screen.findByRole('columnheader', { name: /Actions/i })).toBeInTheDocument();
    });

    it('should render action buttons for each row', async () => {
      renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, {
        selection: { enabled: true },
        actions: {
          enabled: true,
          displayWithItem: true,
          actionsList: [
            {
              type: 'webhook',
              name: 'My Test Action',
              url: 'https://example.com/action',
              method: 'POST',
              contentType: 'json',
              batchMode: 'individual',
            },
          ],
        },
      });

      // Should have action buttons for each of the 2 rows
      const actionButtons = await screen.findAllByRole('button', { name: /My Test Action/i });
      expect(actionButtons).toHaveLength(2);
    });
  });
});
