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

import { ChartsProvider, ItemActionsProvider, SelectionProvider, testChartsTheme } from '@perses-dev/components';
import {
  dynamicImportPluginLoader,
  PluginLoader,
  PluginModuleResource,
  PluginRegistry,
  VariableStateMap,
} from '@perses-dev/plugin-system';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VirtuosoMockContext } from 'react-virtuoso';
import { TimeSeriesData } from '@perses-dev/spec';
import { TableOptions, TimeSeriesTableProps } from '../models';
import {
  MOCK_MULTI_QUERY_DATA_EMPTY,
  MOCK_MULTI_QUERY_DATA_Q1,
  MOCK_MULTI_QUERY_DATA_Q2,
  MOCK_MULTI_QUERY_DATA_WITH_ZERO,
  MOCK_TIME_SERIES_DATA_MULTIVALUE,
  MOCK_TIME_SERIES_DATA_SINGLEVALUE,
  MOCK_TIME_SERIES_QUERY_DEFINITION,
} from '../test/mock-query-results';
import { TablePanel } from './TablePanel';

/* mock all variables */
jest.mock('@perses-dev/plugin-system', () => ({
  ...jest.requireActual('@perses-dev/plugin-system'),
  useAllVariableValues: (): VariableStateMap => ({
    myproject: { loading: false, value: 'my_project' },
    __range: { loading: false, value: '1h' },
  }),
}));

const TEST_TIMEOUT = 15000; // Github Actions is slow
const TEST_TIME_SERIES_TABLE_PROPS: Omit<TimeSeriesTableProps, 'queryResults'> = {
  contentDimensions: {
    width: 500,
    height: 500,
  },
  spec: {},
};

describe('TablePanel', () => {
  // Helper to render the panel with some context set
  const renderPanel = (data: TimeSeriesData, options?: TableOptions): void => {
    render(
      <SelectionProvider>
        <ItemActionsProvider>
          <VirtuosoMockContext.Provider value={{ viewportHeight: 600, itemHeight: 100 }}>
            <ChartsProvider chartsTheme={testChartsTheme}>
              <TablePanel
                {...TEST_TIME_SERIES_TABLE_PROPS}
                spec={options ?? {}}
                queryResults={[{ definition: MOCK_TIME_SERIES_QUERY_DEFINITION, data }]}
              />
            </ChartsProvider>
          </VirtuosoMockContext.Provider>
        </ItemActionsProvider>
      </SelectionProvider>
    );
  };

  it(
    'should render time series in table',
    async () => {
      renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE);

      expect(await screen.findAllByRole('columnheader')).toHaveLength(8); // 1 timestamp column +  1 value column + 6 labels columns
      expect(await screen.findByRole('columnheader', { name: 'timestamp' })).toBeInTheDocument();
      expect(await screen.findByRole('columnheader', { name: 'value' })).toBeInTheDocument();
      expect(await screen.findByRole('columnheader', { name: 'device' })).toBeInTheDocument();
      expect(await screen.findByRole('columnheader', { name: 'env' })).toBeInTheDocument();
      expect(await screen.findByRole('columnheader', { name: 'fstype' })).toBeInTheDocument();
      expect(await screen.findByRole('columnheader', { name: 'instance' })).toBeInTheDocument();
      expect(await screen.findByRole('columnheader', { name: 'job' })).toBeInTheDocument();
      expect(await screen.findByRole('columnheader', { name: 'mountpoint' })).toBeInTheDocument();

      expect(await screen.findAllByRole('cell')).toHaveLength(16); // 2 time series with 8 columns
    },
    TEST_TIMEOUT
  );

  it(
    'should apply column settings',
    async () => {
      renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, {
        columnSettings: [
          {
            name: 'value',
            header: 'Value',
            headerDescription: 'Timeseries Value',
            dataLink: {
              url: 'https://fakeurl.com/$myproject/$__range',
              title: 'data link',
              openNewTab: true,
            },
          },
          { name: 'device', width: 200 },
          { name: 'env', hide: true },
          { name: 'fstype', enableSorting: true },
        ],
      });

      expect(await screen.findAllByRole('columnheader')).toHaveLength(7); // 1 timestamp column +  1 value column + 6 labels columns - 1 column hidden
      expect(screen.queryByRole('columnheader', { name: 'env' })).not.toBeInTheDocument();

      const valueHeaderCell = await screen.findByRole('columnheader', { name: /Value/i });
      expect(valueHeaderCell).toBeInTheDocument();
      expect(await within(valueHeaderCell).findByLabelText('Timeseries Value')).toBeInTheDocument();
      expect(await screen.findByRole('columnheader', { name: /Value/i })).toBeInTheDocument();
      // TODO: Add this line of test after the @perses-dev\components is updated
      // expect(await screen.getByRole('link', { name: /https:\/\/fakeurl\.com\/\$myproject\/\$__range/ }));

      const fstypeHeaderCell = await screen.findByRole('columnheader', { name: 'fstype' });
      expect(fstypeHeaderCell).toBeInTheDocument();
      expect(await within(fstypeHeaderCell).findByTestId('ArrowDownwardIcon')).toBeInTheDocument();

      expect(await screen.findAllByRole('cell')).toHaveLength(14); // 2 time series with 7 columns
    },
    TEST_TIMEOUT
  );

  it('should apply transforms', async () => {
    renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, {
      transforms: [
        {
          kind: 'JoinByColumnValue',
          spec: {
            columns: ['env'],
          },
        },
      ],
    });

    expect(await screen.findAllByRole('cell')).toHaveLength(8); // 1 row of 8 columns (not joined => 16)
    expect(await screen.findByRole('cell', { name: 'demo' })).toBeInTheDocument();
  });

  it('should apply formats', async () => {
    renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, {
      columnSettings: [
        {
          name: 'value',
          format: {
            unit: 'percent-decimal',
          },
        },
      ],
    });
    expect(await screen.findByRole('cell', { name: '27.7%' })).toBeInTheDocument();
  });

  it('should render an embedded panel', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } },
    });
    const pluginResource = {
      kind: 'PluginModule',
      metadata: { name: 'Table', version: '0.1.0' },
      spec: {
        plugins: [
          {
            kind: 'Panel',
            spec: {
              name: 'Table',
              display: {
                name: 'Table',
                description: '',
              },
            },
          },
        ],
      },
    };

    const testPluginLoader: PluginLoader = dynamicImportPluginLoader([
      {
        resource: pluginResource as PluginModuleResource,
        importPlugin: () => import('../Table').then((m) => ({ 'Panel:Table::0.1.0': m.Table })),
      },
    ]);
    render(
      <VirtuosoMockContext.Provider value={{ viewportHeight: 600, itemHeight: 100 }}>
        <ChartsProvider chartsTheme={testChartsTheme}>
          <QueryClientProvider client={queryClient}>
            <PluginRegistry pluginLoader={testPluginLoader}>
              <TablePanel
                {...TEST_TIME_SERIES_TABLE_PROPS}
                spec={{
                  columnSettings: [
                    {
                      name: 'value',
                      plugin: {
                        // This renders a table panel inside a table panel cell, because we don't have access to other panels from this unit test
                        kind: 'Table',
                        spec: {},
                      },
                    },
                  ],
                }}
                queryResults={[
                  { definition: MOCK_TIME_SERIES_QUERY_DEFINITION, data: MOCK_TIME_SERIES_DATA_MULTIVALUE },
                ]}
              />
            </PluginRegistry>
          </QueryClientProvider>
        </ChartsProvider>
      </VirtuosoMockContext.Provider>
    );

    // embedded panel is loaded async
    await waitFor(async () => {
      // the outer table has two rows
      // each row has one table in the 'value' column
      // in total, 3 tables should be visible
      expect(await screen.findAllByRole('table')).toHaveLength(3);
    });
  });

  describe('selection and actions', () => {
    it(
      'should render checkboxes when selection is enabled',
      async () => {
        renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, {
          selection: { enabled: true },
        });

        // Should have checkboxes in the table (header + rows)
        const checkboxes = await screen.findAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);

        // Should have a header checkbox for select all
        const table = screen.getByRole('table');
        const headerRow = within(table).getAllByRole('columnheader');
        expect(headerRow.length).toBeGreaterThan(0);

        // First column header should contain a checkbox
        const firstHeader = headerRow[0];
        if (firstHeader) {
          expect(within(firstHeader).getByRole('checkbox')).toBeInTheDocument();
        }
      },
      TEST_TIMEOUT
    );

    it(
      'should not render checkboxes when selection is disabled',
      async () => {
        renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, {
          selection: { enabled: false },
        });

        // Should not have any checkboxes
        expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
      },
      TEST_TIMEOUT
    );

    it(
      'should not render checkboxes by default when selection is not specified',
      async () => {
        renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE);

        // Should not have any checkboxes by default
        expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
      },
      TEST_TIMEOUT
    );

    it(
      'should allow selecting individual rows when selection is enabled',
      async () => {
        renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, {
          selection: { enabled: true },
        });

        const checkboxes = await screen.findAllByRole('checkbox');
        // First checkbox is header, rest are row checkboxes
        expect(checkboxes.length).toBeGreaterThan(1);

        // Click on the second checkbox (first row)
        const firstRowCheckbox = checkboxes[1];
        if (firstRowCheckbox) {
          userEvent.click(firstRowCheckbox);
          expect(firstRowCheckbox).toBeChecked();
        }
      },
      TEST_TIMEOUT
    );

    it(
      'should select all rows when clicking header checkbox',
      async () => {
        renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, {
          selection: { enabled: true },
        });

        const checkboxes = await screen.findAllByRole('checkbox');
        // First checkbox is header
        const headerCheckbox = checkboxes[0];
        if (headerCheckbox) {
          userEvent.click(headerCheckbox);
          // After clicking header, all checkboxes should be checked
          const allCheckboxes = screen.getAllByRole('checkbox');
          allCheckboxes.forEach((checkbox) => {
            expect(checkbox).toBeChecked();
          });
        }
      },
      TEST_TIMEOUT
    );

    it(
      'should render with actions enabled and display them with every row',
      async () => {
        renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, {
          selection: { enabled: true },
          actions: {
            enabled: true,
            displayWithItem: true,
            actionsList: [
              {
                type: 'event',
                name: 'Test Action',
                eventName: 'test-event',
                batchMode: 'individual',
                enabled: true,
              },
            ],
          },
        });

        // Table should render with checkboxes
        const checkboxes = await screen.findAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThan(0);

        // Action button should not be visible until a row is selected
        const actionButtons = screen.queryAllByRole('button', { name: 'Test Action' });
        expect(actionButtons).toHaveLength(2); // 2 rows with action buttons
      },
      TEST_TIMEOUT
    );
  });

  describe('cellSettings with filtered data', () => {
    // Helper that supports multiple query results (simulates multi-query panels like Memory Quota Table)
    const renderMultiQueryPanel = (queryData: TimeSeriesData[], options?: TableOptions): void => {
      const queryResults = queryData.map((data) => ({
        definition: MOCK_TIME_SERIES_QUERY_DEFINITION,
        data,
      }));
      render(
        <SelectionProvider>
          <ItemActionsProvider>
            <VirtuosoMockContext.Provider value={{ viewportHeight: 600, itemHeight: 100 }}>
              <ChartsProvider chartsTheme={testChartsTheme}>
                <TablePanel {...TEST_TIME_SERIES_TABLE_PROPS} spec={options ?? {}} queryResults={queryResults} />
              </ChartsProvider>
            </VirtuosoMockContext.Provider>
          </ItemActionsProvider>
        </SelectionProvider>
      );
    };

    const MULTI_QUERY_TABLE_OPTIONS: TableOptions = {
      columnSettings: [
        { name: 'timestamp', hide: true },
        { name: 'namespace', header: 'Namespace' },
        { name: 'value #1', header: 'Value 1' },
        { name: 'value #2', header: 'Value 2' },
      ],
      cellSettings: [{ condition: { kind: 'Misc', spec: { value: 'null' } }, text: 'N/A' }],
      transforms: [
        { kind: 'MergeSeries', spec: {} },
        { kind: 'JoinByColumnValue', spec: { columns: ['namespace'] } },
      ],
      enableFiltering: true,
    };

    it(
      'should show N/A for null values and preserve real values in unfiltered multi-query table',
      async () => {
        // Q1 has ns-a and ns-b, Q2 has only ns-a → ns-b's value #2 is null
        renderMultiQueryPanel([MOCK_MULTI_QUERY_DATA_Q1, MOCK_MULTI_QUERY_DATA_Q2], MULTI_QUERY_TABLE_OPTIONS);

        // ns-a should have both values — verify value #2 = 50 is NOT shown as N/A
        expect(await screen.findByRole('cell', { name: 'ns-a' })).toBeInTheDocument();
        expect(await screen.findByRole('cell', { name: '50' })).toBeInTheDocument();

        // ns-b should show N/A for the missing value #2
        expect(await screen.findByRole('cell', { name: 'ns-b' })).toBeInTheDocument();
        const naCells = await screen.findAllByRole('cell', { name: 'N/A' });
        expect(naCells.length).toBeGreaterThanOrEqual(1);

        // Verify real numeric values are preserved (not replaced with N/A)
        expect(await screen.findByRole('cell', { name: '100' })).toBeInTheDocument();
        expect(await screen.findByRole('cell', { name: '200' })).toBeInTheDocument();
      },
      TEST_TIMEOUT
    );

    it(
      'should show N/A for null values after filtering to a row with missing data',
      async () => {
        renderMultiQueryPanel([MOCK_MULTI_QUERY_DATA_Q1, MOCK_MULTI_QUERY_DATA_Q2], MULTI_QUERY_TABLE_OPTIONS);

        // Wait for initial render
        await screen.findByRole('cell', { name: 'ns-b' });

        // Apply filter to show only ns-b (which has null for value #2)
        const filterButtons = screen.getAllByRole('button', { name: '▼' });
        // First filter button corresponds to the first visible column (namespace)
        await userEvent.click(filterButtons[0]!);

        // Select ns-b in the filter dropdown
        const nsBCheckbox = await screen.findByRole('checkbox', { name: 'ns-b' });
        await userEvent.click(nsBCheckbox);

        // After filtering to ns-b only, N/A should still appear for the missing value #2
        await waitFor(() => {
          const naCells = screen.getAllByRole('cell', { name: 'N/A' });
          expect(naCells.length).toBeGreaterThanOrEqual(1);
        });

        // ns-b's value #1 = 200 should still render correctly (not become N/A)
        expect(screen.getByRole('cell', { name: '200' })).toBeInTheDocument();
      },
      TEST_TIMEOUT
    );

    it(
      'should NOT show N/A for genuine zero values',
      async () => {
        // Q1 has ns-a=100 and ns-b=200, ZERO query has ns-a=50 and ns-b=0
        // ns-b's value #2 is 0 (a real number), not null — must NOT show N/A
        renderMultiQueryPanel([MOCK_MULTI_QUERY_DATA_Q1, MOCK_MULTI_QUERY_DATA_WITH_ZERO], MULTI_QUERY_TABLE_OPTIONS);

        // Both namespaces should be present
        expect(await screen.findByRole('cell', { name: 'ns-a' })).toBeInTheDocument();
        expect(await screen.findByRole('cell', { name: 'ns-b' })).toBeInTheDocument();

        // ns-b's value #2 = 0 should render as 0, not N/A
        expect(await screen.findByRole('cell', { name: '0' })).toBeInTheDocument();

        // No N/A should appear — all cells have real values (100, 200, 50, 0)
        expect(screen.queryAllByRole('cell', { name: 'N/A' })).toHaveLength(0);
      },
      TEST_TIMEOUT
    );

    it(
      'should show N/A for columns defined in columnSettings but with no data in any query',
      async () => {
        // Simulates Request Hard column: defined in columnSettings as value #3,
        // but the third query returns no data at all (e.g. no ResourceQuotas on cluster)
        const options: TableOptions = {
          columnSettings: [
            { name: 'timestamp', hide: true },
            { name: 'namespace', header: 'Namespace' },
            { name: 'value #1', header: 'Value 1' },
            { name: 'value #2', header: 'Value 2' },
            { name: 'value #3', header: 'Value 3 (empty query)' },
          ],
          cellSettings: [{ condition: { kind: 'Misc', spec: { value: 'null' } }, text: 'N/A' }],
          transforms: [
            { kind: 'MergeSeries', spec: {} },
            { kind: 'JoinByColumnValue', spec: { columns: ['namespace'] } },
          ],
          enableFiltering: true,
        };

        // Q1 has data, Q2 has partial data, Q3 is completely empty
        renderMultiQueryPanel(
          [MOCK_MULTI_QUERY_DATA_Q1, MOCK_MULTI_QUERY_DATA_Q2, MOCK_MULTI_QUERY_DATA_EMPTY],
          options
        );

        // Both namespaces should be present
        expect(await screen.findByRole('cell', { name: 'ns-a' })).toBeInTheDocument();
        expect(await screen.findByRole('cell', { name: 'ns-b' })).toBeInTheDocument();

        // Value 3 column should show N/A for all rows since no query produced data for it
        const naCells = await screen.findAllByRole('cell', { name: 'N/A' });
        // At minimum: ns-b missing value #2 (1) + both rows missing value #3 (2) = 3 N/A cells
        expect(naCells.length).toBeGreaterThanOrEqual(3);
      },
      TEST_TIMEOUT
    );
  });
});
