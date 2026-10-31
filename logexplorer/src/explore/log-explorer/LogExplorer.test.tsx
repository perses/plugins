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

import type * as PluginSystemModule from '@perses-dev/plugin-system';
import type { QueryDefinition } from '@perses-dev/spec';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

import { LogExplorer } from './LogExplorer';

const mocks = vi.hoisted(() => ({
  data: {} as { queries?: QueryDefinition[] },
  setData: vi.fn(),
  refresh: vi.fn(),
  timeRange: { start: new Date(0), end: new Date(3600_000) },
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
    useTimeRange: (): unknown => ({ refresh: mocks.refresh, absoluteTimeRange: mocks.timeRange }),
    useAllVariableValues: (): unknown => ({}),
    useDatasourceStore: (): unknown => ({}),
    useListPluginMetadata: (): unknown => ({ data: [] }),
    usePluginRegistry: (): unknown => ({ getPlugin: vi.fn() }),
    DataQueriesProvider: ({ children }: { children: ReactNode }): ReactNode => children,
    MultiQueryEditor: ({
      onChange,
      onQueryRun,
    }: {
      onChange: (queries: QueryDefinition[]) => void;
      onQueryRun: () => void;
    }): ReactElement => (
      <>
        <button onClick={() => onChange([makeQuery({ query: '{job="web"}' })])}>Edit</button>
        <button onClick={onQueryRun}>Run Query</button>
      </>
    ),
  };
});

function makeQuery(spec: Record<string, unknown>): QueryDefinition {
  return {
    kind: 'LogQuery',
    spec: { plugin: { kind: 'LokiLogQuery', spec } },
  };
}

function renderExplorer(): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LogExplorer />
    </QueryClientProvider>,
  );
}

describe('LogExplorer', () => {
  beforeEach(() => {
    mocks.setData.mockClear();
    mocks.refresh.mockClear();
  });

  it('refreshes the queries when Run Query is clicked again', () => {
    // A structurally equal copy, as when the explore state is read back from the URL.
    mocks.data = { queries: [makeQuery({ query: '{job="api"}' })] };
    renderExplorer();

    fireEvent.click(screen.getByRole('button', { name: 'Run Query' }));

    expect(mocks.setData).toHaveBeenCalledWith({ queries: [makeQuery({ query: '{job="api"}' })] });
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it('does not refresh when Run Query submits changed queries', () => {
    mocks.data = { queries: [makeQuery({ query: '{job="api"}' })] };
    renderExplorer();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run Query' }));

    expect(mocks.setData).toHaveBeenCalledWith({ queries: [makeQuery({ query: '{job="web"}' })] });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
