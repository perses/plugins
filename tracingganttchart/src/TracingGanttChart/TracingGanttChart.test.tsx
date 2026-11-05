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

import { ChartsProvider, ItemActionsProvider, testChartsTheme } from '@perses-dev/components';
import { VariableProvider } from '@perses-dev/dashboards';
import { ReactRouterProvider, TimeRangeProviderBasic } from '@perses-dev/plugin-system';
import type * as otlptracev1 from '@perses-dev/spec/dist/dashboard/query-type/otlp/trace/v1/trace';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { VirtuosoMockContext } from 'react-virtuoso';

import type { TracingGanttChartOptions } from '../gantt-chart-model';
import * as exampleTrace from '../test/traces/example_otlp.json';
import { TracingGanttChart } from './TracingGanttChart';

const options: TracingGanttChartOptions = {
  actions: {
    enabled: true,
    displayWithItem: true,
    actionsList: [
      { type: 'event', name: 'Show logs', eventName: 'test:show-logs', batchMode: 'individual', enabled: true },
    ],
  },
};
const initialTimeRange = { pastDuration: '1m' } as const;
const virtuosoMock = { viewportHeight: 300, itemHeight: 20 };
const queryClient = new QueryClient();

function Providers(props: { children: ReactElement }): ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ReactRouterProvider>
          <TimeRangeProviderBasic initialTimeRange={initialTimeRange}>
            <VariableProvider>
              <ChartsProvider chartsTheme={testChartsTheme}>
                <VirtuosoMockContext.Provider value={virtuosoMock}>
                  <ItemActionsProvider>{props.children}</ItemActionsProvider>
                </VirtuosoMockContext.Provider>
              </ChartsProvider>
            </VariableProvider>
          </TimeRangeProviderBasic>
        </ReactRouterProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/** returns a copy of the example trace, as returned by a refreshed query, with another status message for span sid2 */
function refreshTrace(statusMessage: string): otlptracev1.TracesData {
  const trace = structuredClone(exampleTrace) as otlptracev1.TracesData;
  for (const resourceSpan of trace.resourceSpans) {
    for (const scopeSpan of resourceSpan.scopeSpans) {
      for (const span of scopeSpan.spans) {
        if (span.spanId === 'sid2') span.status = { ...span.status, message: statusMessage };
      }
    }
  }
  return trace;
}

describe('TracingGanttChart', () => {
  it('executes the item actions with the opened span of the refreshed trace', () => {
    const listener = vi.fn();
    window.addEventListener('test:show-logs', listener);

    const { rerender } = render(
      <Providers>
        <TracingGanttChart options={options} trace={refreshTrace('Forbidden')} />
      </Providers>,
    );
    fireEvent.click(screen.getByText('testChildSpan2'));
    rerender(
      <Providers>
        <TracingGanttChart options={options} trace={refreshTrace('Not found')} />
      </Providers>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show logs' }));

    window.removeEventListener('test:show-logs', listener);
    expect(listener).toHaveBeenCalledTimes(1);
    const detail = JSON.parse((listener.mock.calls[0]![0] as CustomEvent<string>).detail);
    expect(detail).toMatchObject({ id: 'sid2', data: { span: { status: { message: 'Not found' } } } });
  });
});
