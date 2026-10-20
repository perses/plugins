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
import { act, renderHook } from '@testing-library/react';

import * as exampleTrace from '../test/traces/example_otlp.json';
import { getSpanActionData, useSpanSelection } from './span-actions';
import type { SpanActionData } from './span-actions';
import type { Trace } from './trace';
import { getTraceModel } from './trace';

describe('getSpanActionData', () => {
  const trace = getTraceModel(exampleTrace as otlptracev1.TracesData);

  it('returns span, trace and flattened attribute data', () => {
    const span = trace.spanById.get('sid2')!;

    expect(getSpanActionData(trace, span)).toEqual({
      traceId: '5B8EFFF798038103D269B633813FC60C',
      spanId: 'sid2',
      parentSpanId: 'sid1',
      name: 'testChildSpan2',
      kind: 'SPAN_KIND_CLIENT',
      serviceName: 'shop-backend',
      startTimeUnixMs: expect.closeTo(1100),
      endTimeUnixMs: expect.closeTo(1200),
      durationMs: expect.closeTo(100),
      statusCode: 'STATUS_CODE_ERROR',
      statusMessage: 'Forbidden',
      scopeName: 'k6',
      scopeVersion: undefined,
      traceStartTimeUnixMs: expect.closeTo(1000),
      traceEndTimeUnixMs: expect.closeTo(2000),
      'resource.service.name': 'shop-backend',
      'attributes.http.method': 'DELETE',
    });
  });

  it('converts attribute values', () => {
    const span = {
      ...trace.spanById.get('sid1')!,
      attributes: [
        { key: 'int', value: { intValue: '42' } },
        { key: 'double', value: { doubleValue: 4.2 } },
        { key: 'bool', value: { boolValue: true } },
        {
          key: 'array',
          value: {
            arrayValue: { values: [{ stringValue: 'a' }, { intValue: '1' }] },
          },
        },
      ],
    };

    expect(getSpanActionData(trace, span)).toMatchObject({
      'attributes.int': '42',
      'attributes.double': 4.2,
      'attributes.bool': true,
      'attributes.array': ['a', '1'],
    });
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
      spanId: 'sid2',
      'attributes.http.method': 'DELETE',
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

    act(() => result.current.selection.toggleAll());
    expect(result.current.selectionMap.size).toBe(0);
    expect(result.current.selection.allSelected).toBe(false);
  });

  it('clears the selection when the trace changes', () => {
    const { result, rerender } = renderTestHook();

    act(() => result.current.selection.toggleSpan(span1));
    rerender({ trace: getTraceModel(exampleTrace as otlptracev1.TracesData), enabled: true });
    expect(result.current.selectionMap.size).toBe(0);
  });

  it('clears the selection when disabled', () => {
    const { result, rerender } = renderTestHook();

    act(() => result.current.selection.toggleSpan(span1));
    rerender({ trace, enabled: false });
    expect(result.current.selectionMap.size).toBe(0);
    expect(result.current.selection.isSelected('sid1')).toBe(false);
  });
});
