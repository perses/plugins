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
import { screen } from '@testing-library/dom';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';

import * as exampleTrace from '../test/traces/example_otlp.json';
import type { SpanActionData, SpanActionItem } from './span-actions';
import { getSpanActionData, getSpanActionItem, SpanSelectionSync } from './span-actions';
import { getTraceModel } from './trace';

function SelectionContent(): ReactElement {
  const { selectionMap } = useSelection<SpanActionData, string>();
  return <output>{JSON.stringify(Object.fromEntries(selectionMap))}</output>;
}

function Selection(props: { item?: SpanActionItem; mounted?: boolean }): ReactElement {
  const { item, mounted = true } = props;
  return (
    <SelectionProvider>
      {mounted ? <SpanSelectionSync item={item} /> : null}
      <SelectionContent />
    </SelectionProvider>
  );
}

function getSelection(): Record<string, SpanActionData> {
  return JSON.parse(screen.getByRole('status').textContent!);
}

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

describe('SpanSelectionSync', () => {
  const trace = getTraceModel(exampleTrace as otlptracev1.TracesData);
  const item1 = getSpanActionItem(trace, trace.spanById.get('sid1')!);
  const item2 = getSpanActionItem(trace, trace.spanById.get('sid2')!);

  it('exposes the selected span as selection', () => {
    render(<Selection item={item2} />);

    const selection = getSelection();
    expect(Object.keys(selection)).toEqual(['sid2']);
    expect(selection['sid2']).toMatchObject({
      spanId: 'sid2',
      'attributes.http.method': 'DELETE',
    });
  });

  it('replaces the selection when another span is selected', () => {
    const { rerender } = render(<Selection item={item1} />);
    rerender(<Selection item={item2} />);

    expect(Object.keys(getSelection())).toEqual(['sid2']);
  });

  it('clears the selection when the span is deselected', () => {
    const { rerender } = render(<Selection item={item2} />);
    rerender(<Selection item={undefined} />);

    expect(getSelection()).toEqual({});
  });

  it('clears the selection when unmounted', () => {
    const { rerender } = render(<Selection item={item2} />);
    rerender(<Selection item={item2} mounted={false} />);

    expect(getSelection()).toEqual({});
  });
});
