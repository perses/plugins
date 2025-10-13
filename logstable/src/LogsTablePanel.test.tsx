// Copyright 2025 The Perses Authors
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
import { render, screen } from '@testing-library/react';
import { MOCK_LOGS_QUERY_RESULT, MOCK_LOGS_QUERY_DEFINITION } from './test/mock-query-results';
import { LogsTablePanel } from './LogsTablePanel';
import { LogsQueryData, LogsTableProps } from './model';

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
  const renderPanel = (data: LogsQueryData): void => {
    render(
      <SnackbarProvider>
        <ChartsProvider chartsTheme={testChartsTheme}>
          <LogsTablePanel
            {...TEST_LOGS_TABLE_PROPS}
            queryResults={[{ definition: MOCK_LOGS_QUERY_DEFINITION, data }]}
          />
        </ChartsProvider>
      </SnackbarProvider>
    );
  };

  it('should render multi values with timestamps', async () => {
    renderPanel(MOCK_LOGS_QUERY_RESULT);
    const items = screen.getByTestId('virtuoso-item-list');

    expect(await items.querySelectorAll('div[data-index]')).toHaveLength(2); // 2 lines
    expect(await screen.findAllByText('2022-10-24T15:31:30.000Z')).toHaveLength(1); // first timestamp appear once per line
    expect(await screen.findAllByText('2022-10-24T15:31:31.000Z')).toHaveLength(1); // second timestamp appear once per line
  });
});
