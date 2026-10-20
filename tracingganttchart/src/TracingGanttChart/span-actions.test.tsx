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

import { SelectionProvider, useSelection } from '@perses-dev/components';
import type * as otlptracev1 from '@perses-dev/spec/dist/dashboard/query-type/otlp/trace/v1/trace';
import type { RenderHookResult } from '@testing-library/react';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { useCallback } from 'react';

import * as exampleTrace from '../test/traces/example_otlp.json';
import { getSpanActionData, useSpanSelection } from './span-actions';
import type { SpanActionData } from './span-actions';
import type { Span, Trace } from './trace';
import { getTraceModel } from './trace';

interface SpanToggleProps {
  trace: Trace;
  span: Span;
}

function SpanToggle(props: SpanToggleProps): ReactElement {
  const { trace, span } = props;
  const { toggleSpan } = useSpanSelection(trace, true);
  const handleClick = useCallback(() => toggleSpan(span), [toggleSpan, span]);
  return <button onClick={handleClick}>toggle</button>;
}

/** renders a SpanToggle keyed by trace ID, like the gantt chart in the panel */
function KeyedSpanToggle(props: SpanToggleProps & { traceId: string }): ReactElement {
  const { trace, span, traceId } = props;
  const { selectionMap } = useSelection<SpanActionData, string>();
  return (
    <>
      <SpanToggle key={traceId} trace={trace} span={span} />
      <output>{selectionMap.size}</output>
    </>
  );
}

describe('getSpanActionData', () => {
  const trace = getTraceModel(exampleTrace as otlptracev1.TracesData);

  it('returns a serializable span and its trace', () => {
    const span = trace.spanById.get('sid2')!;
    const data = getSpanActionData(trace, span);

    expect(data).toEqual({
      span: {
        traceId: '5B8EFFF798038103D269B633813FC60C',
        spanId: 'sid2',
        parentSpanId: 'sid1',
        name: 'testChildSpan2',
        kind: 'SPAN_KIND_CLIENT',
        startTimeUnixMs: expect.closeTo(1100),
        endTimeUnixMs: expect.closeTo(1200),
        status: { code: 'STATUS_CODE_ERROR', message: 'Forbidden' },
        scope: { name: 'k6' },
        resource: {
          serviceName: 'shop-backend',
          attributes: [{ key: 'service.name', value: { stringValue: 'shop-backend' } }],
        },
        attributes: [{ key: 'http.method', value: { stringValue: 'DELETE' } }],
        events: [
          {
            timeUnixMs: expect.closeTo(1150),
            name: 'event1_name',
            attributes: [{ key: 'event1_key', value: { stringValue: 'event1_value' } }],
          },
        ],
        links: [],
      },
      trace: {
        traceId: '5B8EFFF798038103D269B633813FC60C',
        startTimeUnixMs: expect.closeTo(1000),
        endTimeUnixMs: expect.closeTo(2000),
        spanCount: 3,
      },
    });
    expect(() => JSON.stringify(data)).not.toThrow();
  });
});

describe('useSpanSelection', () => {
  const trace = getTraceModel(exampleTrace as otlptracev1.TracesData);
  const span1 = trace.spanById.get('sid1')!;
  const span2 = trace.spanById.get('sid2')!;

  interface HookProps {
    trace: Trace;
    enabled: boolean;
  }

  function useTestHook(props: HookProps): {
    selection: ReturnType<typeof useSpanSelection>;
    selectionMap: Map<string, SpanActionData>;
  } {
    const selection = useSpanSelection(props.trace, props.enabled);
    const { selectionMap } = useSelection<SpanActionData, string>();
    return { selection, selectionMap };
  }

  function renderTestHook(
    initialProps: HookProps = { trace, enabled: true },
  ): RenderHookResult<ReturnType<typeof useTestHook>, HookProps> {
    return renderHook(useTestHook, { initialProps, wrapper: SelectionProvider });
  }

  it('toggles spans in the panel selection', () => {
    const { result } = renderTestHook();

    act(() => result.current.selection.toggleSpan(span1));
    act(() => result.current.selection.toggleSpan(span2));
    expect([...result.current.selectionMap.keys()]).toEqual(['sid1', 'sid2']);
    expect(result.current.selectionMap.get('sid2')).toMatchObject({
      span: { spanId: 'sid2', attributes: [{ key: 'http.method', value: { stringValue: 'DELETE' } }] },
      trace: { spanCount: 3 },
    });
    expect(result.current.selection.isSelected('sid1')).toBe(true);
    expect(result.current.selection.someSelected).toBe(true);
    expect(result.current.selection.allSelected).toBe(false);

    act(() => result.current.selection.toggleSpan(span1));
    expect([...result.current.selectionMap.keys()]).toEqual(['sid2']);
    expect(result.current.selection.isSelected('sid1')).toBe(false);
  });

  it('selects and deselects all spans', () => {
    const { result } = renderTestHook();

    act(() => result.current.selection.toggleAll());
    expect(result.current.selectionMap.size).toBe(trace.spanById.size);
    expect(result.current.selection.allSelected).toBe(true);
    expect(result.current.selection.someSelected).toBe(false);
    const [first, ...others] = [...result.current.selectionMap.values()];
    for (const item of others) {
      expect(item.trace).toBe(first!.trace);
    }

    act(() => result.current.selection.toggleAll());
    expect(result.current.selectionMap.size).toBe(0);
    expect(result.current.selection.allSelected).toBe(false);
  });

  it('clears the selection when remounted for another trace', () => {
    const { rerender } = render(<KeyedSpanToggle trace={trace} span={span1} traceId="trace1" />, {
      wrapper: SelectionProvider,
    });

    fireEvent.click(screen.getByRole('button', { name: 'toggle' }));
    expect(screen.getByRole('status')).toHaveTextContent('1');

    rerender(<KeyedSpanToggle trace={trace} span={span1} traceId="trace1" />);
    expect(screen.getByRole('status')).toHaveTextContent('1');

    rerender(<KeyedSpanToggle trace={trace} span={span1} traceId="trace2" />);
    expect(screen.getByRole('status')).toHaveTextContent('0');
  });

  it('clears the selection when disabled', () => {
    const { result, rerender } = renderTestHook();

    act(() => result.current.selection.toggleSpan(span1));
    rerender({ trace, enabled: false });
    expect(result.current.selectionMap.size).toBe(0);
    expect(result.current.selection.isSelected('sid1')).toBe(false);
  });
});
