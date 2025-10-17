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

import { ChartsProvider, testChartsTheme } from '@perses-dev/components';
import { TimeSeriesData } from '@perses-dev/core';
import { render, screen, waitFor, within } from '@testing-library/react';
import { VirtuosoMockContext } from 'react-virtuoso';
import {
  dynamicImportPluginLoader,
  PluginLoader,
  PluginModuleResource,
  PluginRegistry,
} from '@perses-dev/plugin-system';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as packagejson from '../../package.json';
import { TimeSeriesTableProps, TableOptions } from '../models';
import {
  MOCK_TIME_SERIES_DATA_MULTIVALUE,
  MOCK_TIME_SERIES_DATA_SINGLEVALUE,
  MOCK_TIME_SERIES_QUERY_DEFINITION,
} from '../test/mock-query-results';
import { TablePanel } from './TablePanel';

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
      <VirtuosoMockContext.Provider value={{ viewportHeight: 600, itemHeight: 100 }}>
        <ChartsProvider chartsTheme={testChartsTheme}>
          <TablePanel
            {...TEST_TIME_SERIES_TABLE_PROPS}
            spec={options ?? {}}
            queryResults={[{ definition: MOCK_TIME_SERIES_QUERY_DEFINITION, data }]}
          />
        </ChartsProvider>
      </VirtuosoMockContext.Provider>
    );
  };

  it('should render time series in table', async () => {
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
  }, 15000); // Github Actions is slow

  it('should apply column settings', async () => {
    renderPanel(MOCK_TIME_SERIES_DATA_SINGLEVALUE, {
      columnSettings: [
        { name: 'value', header: 'Value', headerDescription: 'Timeseries Value' },
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

    const fstypeHeaderCell = await screen.findByRole('columnheader', { name: 'fstype' });
    expect(fstypeHeaderCell).toBeInTheDocument();
    expect(await within(fstypeHeaderCell).findByTestId('ArrowDownwardIcon')).toBeInTheDocument();

    expect(await screen.findAllByRole('cell')).toHaveLength(14); // 2 time series with 7 columns
  });

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
      metadata: { name: 'Table Panel' },
      spec: {
        plugins: packagejson.perses.plugins,
      },
    };
    const testPluginLoader: PluginLoader = dynamicImportPluginLoader([
      { resource: pluginResource as PluginModuleResource, importPlugin: () => import('../Table') },
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
});
