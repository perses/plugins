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

import {
  ChartsProvider,
  ItemActionsProvider,
  SelectionProvider,
  SnackbarProvider,
  testChartsTheme,
} from '@perses-dev/components';
import { TimeSeriesData } from '@perses-dev/core';
import { VariableProvider } from '@perses-dev/dashboards';
import { TimeRangeProviderBasic, WebhookAction } from '@perses-dev/plugin-system';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimeSeriesTableOptions } from './model';
import {
  MOCK_TIME_SERIES_DATA_MULTIVALUE,
  MOCK_TIME_SERIES_DATA_SINGLEVALUE,
  MOCK_TIME_SERIES_QUERY_DEFINITION,
} from './test/mock-query-results';
import { TimeSeriesTablePanel, TimeSeriesTableProps } from './TimeSeriesTablePanel';

const TEST_PROPS: Omit<TimeSeriesTableProps, 'queryResults'> = {
  contentDimensions: { width: 500, height: 500 },
  spec: {},
};

const TEST_WEBHOOK_ACTION: WebhookAction = {
  type: 'webhook',
  name: 'Test Action',
  url: 'https://example.com/action',
  method: 'POST',
  contentType: 'json',
  batchMode: 'individual',
  enabled: true,
};

const EXPECTED_SERIES_TEXT =
  '{device="/dev/vda1", env="demo", fstype="ext4", instance="demo.do.prometheus.io:9100", job="node", mountpoint="/"}';

describe('TimeSeriesTablePanel', () => {
  const renderPanel = (data: TimeSeriesData, options?: TimeSeriesTableOptions) => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <SnackbarProvider>
          <TimeRangeProviderBasic initialTimeRange={{ pastDuration: '1m' }}>
            <VariableProvider>
              <SelectionProvider>
                <ItemActionsProvider>
                  <ChartsProvider chartsTheme={testChartsTheme}>
                    <TimeSeriesTablePanel
                      {...TEST_PROPS}
                      spec={options ?? {}}
                      queryResults={[{ definition: MOCK_TIME_SERIES_QUERY_DEFINITION, data }]}
                    />
                  </ChartsProvider>
                </ItemActionsProvider>
              </SelectionProvider>
            </VariableProvider>
          </TimeRangeProviderBasic>
        </SnackbarProvider>
      </QueryClientProvider>
    );
  };

  const getCheckboxes = () => screen.findAllByRole('checkbox');

  it('should render multi values with timestamps', async () => {
    renderPanel(MOCK_TIME_SERIES_DATA_MULTIVALUE);

    expect(screen.getAllByText((_, el) => el?.textContent === EXPECTED_SERIES_TEXT).length).toBeGreaterThan(0);
    expect(await screen.findAllByRole('cell')).toHaveLength(4);
    expect(await screen.findAllByText('@1666479357903')).toHaveLength(2);
    expect(await screen.findAllByText('@1666479382282')).toHaveLength(2);
  });

  it('should render single value without timestamp', async () => {
    renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE);

    expect(screen.getAllByText((_, el) => el?.textContent === EXPECTED_SERIES_TEXT).length).toBeGreaterThan(0);
    expect(await screen.findAllByRole('cell')).toHaveLength(4);
    expect(screen.queryByText('@')).toBeNull();
  });

  describe('Selection', () => {
    it('should not render checkboxes when disabled', () => {
      renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, { selection: { enabled: false } });
      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    });

    it('should render checkboxes when enabled', async () => {
      renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, { selection: { enabled: true } });
      expect(await getCheckboxes()).toHaveLength(3); // 1 header + 2 rows
    });

    it('should render table header with column labels', async () => {
      renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, { selection: { enabled: true } });

      expect(await screen.findByRole('columnheader', { name: 'Series' })).toBeInTheDocument();
      expect(await screen.findByRole('columnheader', { name: 'Value' })).toBeInTheDocument();
    });

    it('should toggle row selection when clicking checkbox', async () => {
      renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, { selection: { enabled: true } });

      const [, rowCheckbox] = await getCheckboxes();
      expect(rowCheckbox).not.toBeChecked();

      userEvent.click(rowCheckbox!);
      expect(rowCheckbox).toBeChecked();

      userEvent.click(rowCheckbox!);
      expect(rowCheckbox).not.toBeChecked();
    });

    it('should select all rows when clicking header checkbox', async () => {
      renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, { selection: { enabled: true } });

      const [selectAll, row1, row2] = await getCheckboxes();
      expect(selectAll).not.toBeChecked();

      userEvent.click(selectAll!);
      expect(selectAll).toBeChecked();
      expect(row1).toBeChecked();
      expect(row2).toBeChecked();
    });

    it('should deselect all rows when clicking header checkbox while all selected', async () => {
      renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, { selection: { enabled: true } });

      const [selectAll] = await getCheckboxes();
      userEvent.click(selectAll!);
      expect(selectAll).toBeChecked();

      userEvent.click(selectAll!);
      expect(selectAll).not.toBeChecked();

      const [, row1, row2] = await getCheckboxes();
      expect(row1).not.toBeChecked();
      expect(row2).not.toBeChecked();
    });
  });

  describe('Item Actions', () => {
    const actionsConfig = (name = 'Test Action'): TimeSeriesTableOptions => ({
      selection: { enabled: true },
      actions: {
        enabled: true,
        displayWithItem: true,
        actionsList: [{ ...TEST_WEBHOOK_ACTION, name }],
      },
    });

    it('should not render actions column when disabled', () => {
      renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, {
        selection: { enabled: true },
        actions: { enabled: false },
      });
      expect(screen.queryByRole('columnheader', { name: /Actions/i })).not.toBeInTheDocument();
    });

    it('should render actions column when enabled with displayWithItem', async () => {
      renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, actionsConfig());
      expect(await screen.findByRole('columnheader', { name: /Actions/i })).toBeInTheDocument();
    });

    it('should render action buttons for each row', async () => {
      renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, actionsConfig('My Test Action'));
      expect(await screen.findAllByRole('button', { name: /My Test Action/i })).toHaveLength(2);
    });
  });
});
