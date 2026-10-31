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
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

import { TempoExplorer } from './TempoExplorer';

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
    useDataQueries: (): unknown => ({ queryResults: [], isFetching: false, isLoading: false }),
    DataQueriesProvider: ({ children }: { children: ReactNode }): ReactNode => children,
    MultiQueryEditor: ({
      onChange,
      onQueryRun,
    }: {
      onChange: (queries: QueryDefinition[]) => void;
      onQueryRun: () => void;
    }): ReactElement => (
      <>
        <button onClick={() => onChange([makeQuery({ query: '{ duration > 1s }' })])}>Edit</button>
        <button onClick={onQueryRun}>Run Query</button>
      </>
    ),
  };
});

function makeQuery(spec: Record<string, unknown>): QueryDefinition {
  return {
    kind: 'TraceQuery',
    spec: { plugin: { kind: 'TempoTraceQuery', spec } },
  };
}

function renderExplorer(): void {
  render(<TempoExplorer />);
}

describe('TempoExplorer', () => {
  beforeEach(() => {
    mocks.setData.mockClear();
    mocks.refresh.mockClear();
  });

  it('refreshes the queries when Run Query is clicked again', () => {
    // A structurally equal copy, as when the explore state is read back from the URL.
    mocks.data = { queries: [makeQuery({ query: '{ status = error }' })] };
    renderExplorer();

    fireEvent.click(screen.getByRole('button', { name: 'Run Query' }));

    expect(mocks.setData).toHaveBeenCalledWith({ queries: [makeQuery({ query: '{ status = error }' })] });
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it('does not refresh when Run Query submits changed queries', () => {
    mocks.data = { queries: [makeQuery({ query: '{ status = error }' })] };
    renderExplorer();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run Query' }));

    expect(mocks.setData).toHaveBeenCalledWith({ queries: [makeQuery({ query: '{ duration > 1s }' })] });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
