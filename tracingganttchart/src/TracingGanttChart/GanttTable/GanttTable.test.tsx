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
import { fireEvent, screen } from '@testing-library/dom';
import { render, RenderResult } from '@testing-library/react';
import { VirtuosoMockContext } from 'react-virtuoso';
import { MOCK_GANTT_TRACE } from '../../test/mock-trace-data';
import { GanttTable, GanttTableProps } from './GanttTable';
import { GanttTableProvider } from './GanttTableProvider';

describe('GanttTable', () => {
  const renderComponent = (props: Omit<GanttTableProps, 'onSpanClick'>): RenderResult => {
    const onSpanClick = jest.fn();
    return render(
      <ChartsProvider chartsTheme={testChartsTheme}>
        <VirtuosoMockContext.Provider value={{ viewportHeight: 300, itemHeight: 20 }}>
          <GanttTableProvider>
            <GanttTable {...props} onSpanClick={onSpanClick} />
          </GanttTableProvider>
        </VirtuosoMockContext.Provider>
      </ChartsProvider>
    );
  };

  it('render table', () => {
    renderComponent({
      options: {},
      trace: MOCK_GANTT_TRACE,
      viewport: {
        startTimeUnixMs: MOCK_GANTT_TRACE.startTimeUnixMs,
        endTimeUnixMs: MOCK_GANTT_TRACE.endTimeUnixMs,
      },
    });
    expect(screen.getByText('testRootSpan')).toBeInTheDocument();
    expect(screen.getByText('testChildSpan2')).toBeInTheDocument();
    expect(screen.getByText('testChildSpan3')).toBeInTheDocument();
  });

  it('collapses a span on click', () => {
    renderComponent({
      options: {},
      trace: MOCK_GANTT_TRACE,
      viewport: {
        startTimeUnixMs: MOCK_GANTT_TRACE.startTimeUnixMs,
        endTimeUnixMs: MOCK_GANTT_TRACE.endTimeUnixMs,
      },
    });
    fireEvent.click(screen.getAllByTitle('collapse')[1]!);
    expect(screen.getByText('testRootSpan')).toBeInTheDocument();
    expect(screen.getByText('testChildSpan2')).toBeInTheDocument();
    expect(screen.queryByText('testChildSpan3')).not.toBeInTheDocument();
  });
});
