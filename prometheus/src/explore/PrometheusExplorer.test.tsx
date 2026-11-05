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

import { PrometheusExplorer } from './PrometheusExplorer';

const mocks = vi.hoisted(() => ({
  data: {} as { tab?: string; queries?: QueryDefinition[] },
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
    useSuggestedStepMs: (): number => 0,
    DataQueriesProvider: ({ children }: { children: ReactNode }): ReactNode => children,
    MultiQueryEditor: ({
      onChange,
      onQueryRun,
    }: {
      onChange: (queries: QueryDefinition[]) => void;
      onQueryRun: () => void;
    }): ReactElement => (
      <>
        <button onClick={() => onChange([makeQuery('rate(up[5m])')])}>Edit</button>
        <button onClick={onQueryRun}>Run Query</button>
      </>
    ),
  };
});

function makeQuery(query: string): QueryDefinition {
  return {
    kind: 'TimeSeriesQuery',
    spec: { plugin: { kind: 'PrometheusTimeSeriesQuery', spec: { query } } },
  };
}

describe('PrometheusExplorer', () => {
  beforeEach(() => {
    mocks.setData.mockClear();
    mocks.refresh.mockClear();
  });

  it.each(['table', 'graph'])('refreshes the queries when Run Query is clicked again (%s tab)', (tab) => {
    // A structurally equal copy, as when the explore state is read back from the URL.
    mocks.data = { tab, queries: [makeQuery('up')] };
    render(<PrometheusExplorer />);

    fireEvent.click(screen.getByRole('button', { name: 'Run Query' }));

    expect(mocks.setData).toHaveBeenCalledWith({ tab, queries: [makeQuery('up')] });
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it('does not refresh when Run Query submits changed queries', () => {
    mocks.data = { tab: 'table', queries: [makeQuery('up')] };
    render(<PrometheusExplorer />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run Query' }));

    expect(mocks.setData).toHaveBeenCalledWith({ tab: 'table', queries: [makeQuery('rate(up[5m])')] });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
