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

import { SnackbarProvider } from '@perses-dev/components';
import type * as PluginSystemModule from '@perses-dev/plugin-system';
import type { QueryDefinition } from '@perses-dev/spec';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

import { AlertManagerSilencesExplorer } from './AlertManagerSilencesExplorer';

const mocks = vi.hoisted(() => ({
  data: {} as { queries?: QueryDefinition[] },
  setData: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('@perses-dev/explore', () => ({
  useExplorerManagerContext: (): unknown => ({ data: mocks.data, setData: mocks.setData }),
}));

vi.mock('@perses-dev/dashboards', () => ({
  Panel: (): null => null,
}));

vi.mock('@perses-dev/plugin-system', async (importOriginal) => {
  const actual = await importOriginal<typeof PluginSystemModule>();
  return {
    ...actual,
    useTimeRange: (): unknown => ({ refresh: mocks.refresh }),
    useDatasourceClient: (): unknown => ({ data: undefined }),
    DataQueriesProvider: ({ children }: { children: ReactNode }): ReactNode => children,
    MultiQueryEditor: ({
      onChange,
      onQueryRun,
    }: {
      onChange: (queries: QueryDefinition[]) => void;
      onQueryRun: () => void;
    }): ReactElement => (
      <>
        <button onClick={() => onChange([makeQuery({ filters: ['alertname="Watchdog"'] })])}>Edit</button>
        <button onClick={onQueryRun}>Run Query</button>
      </>
    ),
  };
});

function makeQuery(spec: Record<string, unknown>): QueryDefinition {
  return {
    kind: 'SilencesQuery',
    spec: { plugin: { kind: 'AlertManagerSilencesQuery', spec } },
  };
}

function renderExplorer(): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SnackbarProvider>
        <AlertManagerSilencesExplorer />
      </SnackbarProvider>
    </QueryClientProvider>,
  );
}

describe('AlertManagerSilencesExplorer', () => {
  beforeEach(() => {
    mocks.setData.mockClear();
    mocks.refresh.mockClear();
  });

  it('refreshes the queries when Run Query is clicked again', () => {
    // A structurally equal copy, as when the explore state is read back from the URL.
    mocks.data = { queries: [makeQuery({ filters: [] })] };
    renderExplorer();

    fireEvent.click(screen.getByRole('button', { name: 'Run Query' }));

    expect(mocks.setData).toHaveBeenCalledWith({ queries: [makeQuery({ filters: [] })] });
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it('does not refresh when Run Query submits changed queries', () => {
    mocks.data = { queries: [makeQuery({ filters: [] })] };
    renderExplorer();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run Query' }));

    expect(mocks.setData).toHaveBeenCalledWith({ queries: [makeQuery({ filters: ['alertname="Watchdog"'] })] });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
