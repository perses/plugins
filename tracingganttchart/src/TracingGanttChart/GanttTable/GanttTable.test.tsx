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

import { ChartsProvider, SelectionProvider, testChartsTheme, useSelection } from '@perses-dev/components';
import type * as otlptracev1 from '@perses-dev/spec/dist/dashboard/query-type/otlp/trace/v1/trace';
import { fireEvent, screen } from '@testing-library/dom';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { VirtuosoMockContext } from 'react-virtuoso';

import type { TracingGanttChartOptions } from '../../gantt-chart-model';
import * as exampleTrace from '../../test/traces/example_otlp.json';
import { getTraceModel } from '../trace';
import type { GanttTableProps } from './GanttTable';
import { GanttTable } from './GanttTable';
import { GanttTableProvider } from './GanttTableProvider';

const selectionTrace = getTraceModel(exampleTrace as otlptracev1.TracesData);
const selectionViewport = {
  startTimeUnixMs: selectionTrace.startTimeUnixMs,
  endTimeUnixMs: selectionTrace.endTimeUnixMs,
};
const selectionOptions: TracingGanttChartOptions = { selection: { enabled: true } };
const virtuosoMock = { viewportHeight: 300, itemHeight: 20 };

function SelectableGanttTable(props: { onSpanClick: () => void }): ReactElement {
  const { selectionMap } = useSelection<unknown, string>();
  return (
    <>
      <GanttTable
        options={selectionOptions}
        trace={selectionTrace}
        viewport={selectionViewport}
        onSpanClick={props.onSpanClick}
      />
      <output>{[...selectionMap.keys()].join(',')}</output>
    </>
  );
}

function renderSelectableComponent(): { onSpanClick: () => void } {
  const onSpanClick = vi.fn();
  render(
    <ChartsProvider chartsTheme={testChartsTheme}>
      <VirtuosoMockContext.Provider value={virtuosoMock}>
        <SelectionProvider>
          <GanttTableProvider>
            <SelectableGanttTable onSpanClick={onSpanClick} />
          </GanttTableProvider>
        </SelectionProvider>
      </VirtuosoMockContext.Provider>
    </ChartsProvider>,
  );
  return { onSpanClick };
}

describe('GanttTable', () => {
  const trace = getTraceModel(exampleTrace as otlptracev1.TracesData);
  const renderComponent = (props: Omit<GanttTableProps, 'onSpanClick'>): RenderResult => {
    const onSpanClick = vi.fn();
    return render(
      <ChartsProvider chartsTheme={testChartsTheme}>
        <VirtuosoMockContext.Provider value={{ viewportHeight: 300, itemHeight: 20 }}>
          <GanttTableProvider>
            <GanttTable {...props} onSpanClick={onSpanClick} />
          </GanttTableProvider>
        </VirtuosoMockContext.Provider>
      </ChartsProvider>,
    );
  };

  it('render table', () => {
    renderComponent({
      options: {},
      trace,
      viewport: {
        startTimeUnixMs: trace.startTimeUnixMs,
        endTimeUnixMs: trace.endTimeUnixMs,
      },
    });
    expect(screen.getByText('testRootSpan')).toBeInTheDocument();
    expect(screen.getByText('testChildSpan2')).toBeInTheDocument();
    expect(screen.getByText('testChildSpan3')).toBeInTheDocument();
  });

  describe('selection', () => {
    it('renders no checkbox if selection is disabled', () => {
      renderComponent({
        options: {},
        trace,
        viewport: {
          startTimeUnixMs: trace.startTimeUnixMs,
          endTimeUnixMs: trace.endTimeUnixMs,
        },
      });
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('selects multiple spans without opening them', () => {
      const { onSpanClick } = renderSelectableComponent();

      fireEvent.click(screen.getByRole('checkbox', { name: 'select span shop-backend: testRootSpan' }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'select span shop-backend: testChildSpan2' }));

      expect(screen.getByRole('status')).toHaveTextContent('sid1,sid2');
      expect(screen.getByRole('checkbox', { name: 'select span shop-backend: testRootSpan' })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'select all spans' })).toHaveAttribute('data-indeterminate', 'true');
      expect(onSpanClick).not.toHaveBeenCalled();
    });

    it('selects all spans', () => {
      renderSelectableComponent();

      fireEvent.click(screen.getByRole('checkbox', { name: 'select all spans' }));
      expect(screen.getByRole('status').textContent!.split(',')).toHaveLength(selectionTrace.spanById.size);
      for (const checkbox of screen.getAllByRole('checkbox')) {
        expect(checkbox).toBeChecked();
      }

      fireEvent.click(screen.getByRole('checkbox', { name: 'select all spans' }));
      expect(screen.getByRole('status')).toHaveTextContent('');
    });
  });

  it('collapses a span on click', () => {
    renderComponent({
      options: {},
      trace,
      viewport: {
        startTimeUnixMs: trace.startTimeUnixMs,
        endTimeUnixMs: trace.endTimeUnixMs,
      },
    });
    fireEvent.click(screen.getAllByTitle('collapse')[1]!);
    expect(screen.getByText('testRootSpan')).toBeInTheDocument();
    expect(screen.getByText('testChildSpan2')).toBeInTheDocument();
    expect(screen.queryByText('testChildSpan3')).not.toBeInTheDocument();
  });
});
