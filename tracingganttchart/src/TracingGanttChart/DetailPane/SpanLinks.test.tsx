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

import { screen } from '@testing-library/dom';
import { render, RenderResult } from '@testing-library/react';
import { otlptracev1 } from '@perses-dev/core';
import { MemoryRouter } from 'react-router-dom';
import { VariableProvider } from '@perses-dev/dashboards';
import { ReactRouterProvider, TimeRangeProvider } from '@perses-dev/plugin-system';
import { CustomLinks } from '../../gantt-chart-model';
import { getTraceModel } from '../trace';
import * as exampleTrace from '../../test/traces/example_otlp.json';
import { SpanLinkList, SpanLinkListProps } from './SpanLinks';

describe('SpanLinks', () => {
  const trace = getTraceModel(exampleTrace as otlptracev1.TracesData);
  const renderComponent = (props: SpanLinkListProps): RenderResult => {
    return render(
      <MemoryRouter>
        <ReactRouterProvider>
          <TimeRangeProvider timeRange={{ pastDuration: '1m' }}>
            <VariableProvider>
              <SpanLinkList {...props} />
            </VariableProvider>
          </TimeRangeProvider>
        </ReactRouterProvider>
      </MemoryRouter>
    );
  };

  it('render', () => {
    renderComponent({ span: trace.rootSpans[0]!.childSpans[0]!.childSpans[0]! });

    expect(screen.getByText('tid1')).toBeInTheDocument();
    expect(screen.getByText('sid1')).toBeInTheDocument();
    expect(screen.getByText('link-key1')).toBeInTheDocument();
    expect(screen.getByText('link-value1')).toBeInTheDocument();
  });

  it('render link to trace', () => {
    const customLinks: CustomLinks = {
      links: {
        trace: '/datasource/${datasourceName}/trace/${traceId}',
        span: '/datasource/${datasourceName}/trace/${traceId}?span=${spanId}',
      },
      variables: {
        datasourceName: 'tempods',
      },
    };

    renderComponent({ customLinks, span: trace.rootSpans[0]!.childSpans[0]!.childSpans[0]! });
    expect(screen.getByRole('link', { name: 'tid1' })).toHaveAttribute('href', '/datasource/tempods/trace/tid1');
    expect(screen.getByRole('link', { name: 'sid1' })).toHaveAttribute(
      'href',
      '/datasource/tempods/trace/tid1?span=sid1'
    );
  });
});
