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

import { VariableProvider } from '@perses-dev/dashboards';
import type { ItemAction } from '@perses-dev/plugin-system';
import { ReactRouterProvider, TimeRangeProviderBasic } from '@perses-dev/plugin-system';
import type * as otlptracev1 from '@perses-dev/spec/dist/dashboard/query-type/otlp/trace/v1/trace';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, screen } from '@testing-library/dom';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import * as exampleTrace from '../../test/traces/example_otlp.json';
import { getSpanActionItem } from '../span-actions';
import { getTraceModel } from '../trace';
import { DetailPane } from './DetailPane';

const trace = getTraceModel(exampleTrace as otlptracev1.TracesData);
const span = trace.spanById.get('sid2')!;
const actionItem = getSpanActionItem(trace, span);
const initialTimeRange = { pastDuration: '1m' } as const;

function noop(): void {}

function renderComponent(actions?: ItemAction[]): RenderResult {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <ReactRouterProvider>
          <TimeRangeProviderBasic initialTimeRange={initialTimeRange}>
            <VariableProvider>
              <DetailPane trace={trace} span={span} actions={actions} actionItem={actionItem} onCloseBtnClick={noop} />
            </VariableProvider>
          </TimeRangeProviderBasic>
        </ReactRouterProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const showLogsAction: ItemAction = {
  type: 'event',
  name: 'Show logs',
  eventName: 'test:show-logs',
  batchMode: 'individual',
  enabled: true,
};

describe('DetailPane', () => {
  it('renders no action button by default', () => {
    renderComponent();

    expect(screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual(['close']);
  });

  it('renders the enabled actions as buttons with label and icon', () => {
    renderComponent([
      { ...showLogsAction, icon: 'troubleshoot' },
      { ...showLogsAction, name: 'Disabled action', enabled: false },
    ]);

    const button = screen.getByRole('button', { name: 'Show logs' });
    expect(button).toHaveClass('MuiButton-outlined');
    expect(button.querySelector('.MuiButton-startIcon svg')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Disabled action' })).not.toBeInTheDocument();
  });

  it('dispatches an event with the span data', () => {
    const listener = vi.fn();
    window.addEventListener('test:show-logs', listener);

    renderComponent([showLogsAction]);
    fireEvent.click(screen.getByRole('button', { name: 'Show logs' }));

    window.removeEventListener('test:show-logs', listener);
    expect(listener).toHaveBeenCalledTimes(1);
    const detail = JSON.parse((listener.mock.calls[0]![0] as CustomEvent<string>).detail);
    expect(detail).toMatchObject({
      id: 'sid2',
      data: {
        span: {
          traceId: '5B8EFFF798038103D269B633813FC60C',
          spanId: 'sid2',
          attributes: [{ key: 'http.method', value: { stringValue: 'DELETE' } }],
        },
        trace: { traceId: '5B8EFFF798038103D269B633813FC60C' },
      },
    });
  });

  it('interpolates the body template with the span data', () => {
    const listener = vi.fn();
    window.addEventListener('test:show-logs', listener);

    renderComponent([
      {
        ...showLogsAction,
        bodyTemplate: '${__data.fields["span.resource.serviceName"]}/${__data.fields["span.status.code"]}',
      },
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Show logs' }));

    window.removeEventListener('test:show-logs', listener);
    expect((listener.mock.calls[0]![0] as CustomEvent<string>).detail).toBe('shop-backend/STATUS_CODE_ERROR');
  });

  it('asks for confirmation', () => {
    const listener = vi.fn();
    window.addEventListener('test:show-logs', listener);

    renderComponent([{ ...showLogsAction, confirmMessage: 'Are you sure?' }]);
    fireEvent.click(screen.getByRole('button', { name: 'Show logs' }));
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(listener).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    window.removeEventListener('test:show-logs', listener);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('cancels the confirmation', () => {
    const listener = vi.fn();
    window.addEventListener('test:show-logs', listener);

    renderComponent([{ ...showLogsAction, confirmMessage: 'Are you sure?' }]);
    fireEvent.click(screen.getByRole('button', { name: 'Show logs' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    window.removeEventListener('test:show-logs', listener);
    expect(listener).not.toHaveBeenCalled();
  });
});
