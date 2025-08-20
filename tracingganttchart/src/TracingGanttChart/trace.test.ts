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

import { otlptracev1 } from '@perses-dev/core';
import * as exampleTrace from '../test/traces/example_otlp.json';
import * as missingRootSpanTrace from '../test/traces/pushbytes_no_root_span_otlp.json';
import * as incompleteTrace from '../test/traces/pushbytes_incomplete_otlp.json';
import * as asyncTrace from '../test/traces/async_jaeger.json';
import { JaegerTrace, jaegerTraceToOTLP } from '../test/convert/jaeger';
import { getTraceModel, Span } from './trace';

describe('trace', () => {
  it('computes a GanttTrace model from a trace', (): void => {
    const ganttTrace = getTraceModel(exampleTrace as otlptracev1.TracesData);
    expect(ganttTrace.startTimeUnixMs).toEqual(1000);
    expect(ganttTrace.endTimeUnixMs).toEqual(2000);
  });

  it('computes a GanttTrace model from a trace where trace duration != root span duration', () => {
    const ganttTrace = getTraceModel(jaegerTraceToOTLP(asyncTrace as JaegerTrace));
    expect(ganttTrace.startTimeUnixMs).toEqual(1729001599633.602);
    expect(ganttTrace.endTimeUnixMs).toEqual(1729001599964.748);
  });

  it('builds a span tree', async () => {
    const ganttTrace = getTraceModel(exampleTrace as otlptracev1.TracesData);
    expect(ganttTrace.rootSpans).toEqual([spanTree]);
  });

  it('builds a span tree of a trace without root span', async () => {
    const ganttTrace = getTraceModel(missingRootSpanTrace as otlptracev1.TracesData);
    expect(ganttTrace.rootSpans[0]!.name).toEqual('distributor.PushTraces');
    expect(ganttTrace.rootSpans[0]!.childSpans[0]!.name).toEqual('tempopb.Pusher/PushBytesV2');
  });

  it('builds a span tree of an incomplete trace', async () => {
    const ganttTrace = getTraceModel(incompleteTrace as otlptracev1.TracesData);
    expect(ganttTrace.rootSpans[0]!.name).toEqual('distributor.ConsumeTraces');
    expect(ganttTrace.rootSpans[1]!.name).toEqual('tempopb.Pusher/PushBytesV2');
  });
});

const spanTree = {
  resource: {
    serviceName: 'shop-backend',
    attributes: [{ key: 'service.name', value: { stringValue: 'shop-backend' } }],
  },
  scope: { name: 'k6' },
  childSpans: [
    {
      resource: {
        serviceName: 'shop-backend',
        attributes: [{ key: 'service.name', value: { stringValue: 'shop-backend' } }],
      },
      scope: { name: 'k6' },
      childSpans: [
        {
          resource: {
            serviceName: 'shop-backend',
            attributes: [{ key: 'service.name', value: { stringValue: 'shop-backend' } }],
          },
          scope: { name: 'k6' },
          childSpans: [],
          traceId: '5B8EFFF798038103D269B633813FC60C',
          spanId: 'sid3',
          parentSpanId: 'sid2',
          name: 'testChildSpan3',
          kind: 'SPAN_KIND_CLIENT',
          startTimeUnixMs: 1300,
          endTimeUnixMs: 1450,
          attributes: [{ key: 'http.method', value: { stringValue: 'PUT' } }],
          events: [],
          status: {},
        },
      ],
      traceId: '5B8EFFF798038103D269B633813FC60C',
      spanId: 'sid2',
      parentSpanId: 'sid1',
      name: 'testChildSpan2',
      kind: 'SPAN_KIND_CLIENT',
      startTimeUnixMs: 1100,
      endTimeUnixMs: 1200,
      attributes: [{ key: 'http.method', value: { stringValue: 'DELETE' } }],
      events: [
        {
          timeUnixMs: 1150,
          name: 'event1_name',
          attributes: [{ key: 'event1_key', value: { stringValue: 'event1_value' } }],
        },
      ],
      status: { message: 'Forbidden', code: 'STATUS_CODE_ERROR' as const },
    },
  ],
  traceId: '5B8EFFF798038103D269B633813FC60C',
  spanId: 'sid1',
  name: 'testRootSpan',
  kind: 'SPAN_KIND_SERVER',
  startTimeUnixMs: 1000,
  endTimeUnixMs: 2000,
  attributes: [],
  events: [],
  status: {},
};

function addParentReferences(span: Span): void {
  for (const child of span.childSpans) {
    child.parentSpan = span;
    addParentReferences(child);
  }
}
addParentReferences(spanTree);
